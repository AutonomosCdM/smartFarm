# GitHub Actions SSH Connection Investigation

## Summary

GitHub Actions workflows cannot SSH to the AWS Lightsail instance (98.87.30.163), despite:
- Port 22 being open in Lightsail firewall (0.0.0.0/0)
- Local SSH connections working perfectly
- No iptables/UFW blocking rules
- fail2ban NOT blocking GitHub IPs

## Investigation Timeline

### Initial State
- AWS Lightsail instance: `smartfarm` at 98.87.30.163
- Ports open: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3001 (TCP)
- All ports configured to allow 0.0.0.0/0

### Test Results

#### ✅ Local SSH (WORKS)
```bash
$ ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "echo 'test'"
test
```

#### ❌ GitHub Actions SSH (FAILS)
```
ssh: connect to host *** port 22: Connection timed out
```

#### 🔍 Key Finding
**NO connection attempts from GitHub Actions appear in SSH logs:**
```bash
$ sudo journalctl -u ssh --since '13:22:50' --until '13:23:30'
-- No entries --
```

This means packets are being **dropped at the network layer** before reaching the SSH daemon.

## Environment Details

### AWS Lightsail Configuration
```json
{
  "Instance": "smartfarm",
  "PublicIP": "98.87.30.163",
  "PrivateIP": "172.26.14.44",
  "IPv6": "2600:1f18:295a:ae00:5362:f79e:5ddb:6960",
  "State": "running",
  "BundleId": "small_2_0"
}
```

### Firewall Rules
```json
{
  "Port 22": {
    "protocol": "tcp",
    "state": "open",
    "cidrs": ["0.0.0.0/0"],
    "ipv6Cidrs": ["::/0"]
  }
}
```

### fail2ban Status
```
Currently banned: 1
Banned IP: 103.186.1.120 (not a GitHub IP)
Configuration: 3 retries in 10 minutes = 1 hour ban
```

### iptables
```
Chain INPUT (policy ACCEPT)
# No blocking rules
```

### UFW
```
Status: inactive
```

## GitHub Actions IP Ranges

GitHub Actions runners use dynamic IPs from these ranges:
```
4.148.0.0/16
4.149.0.0/18
4.149.64.0/19
... (and many more)
```

**Full list:** https://api.github.com/meta (`.actions[]`)

## Tested Workflow Configurations

### Attempt 1: Basic SSH Config
```yaml
StrictHostKeyChecking no
UserKnownHostsFile /dev/null
```
**Result:** Connection timeout after 2 minutes

### Attempt 2: Added Timeouts & Keep-Alive
```yaml
ConnectTimeout 30
ServerAliveInterval 10
ServerAliveCountMax 3
```
**Result:** Still timeout

### Attempt 3: SSH ControlMaster (Connection Reuse)
```yaml
ControlMaster auto
ControlPath /tmp/ssh-control/%r@%h:%p
ControlPersist 10m
```
**Result:** Still timeout (failed faster - 30s)

## Root Cause Hypothesis

The issue appears to be **AWS Lightsail network-level filtering** that is not visible through:
- `aws lightsail get-instance-port-states`
- `aws lightsail get-instance --instance-name smartfarm`
- SSH daemon logs
- iptables/UFW

**Possible causes:**
1. **AWS Lightsail has hidden network ACLs** for cloud service IPs
2. **GitHub Actions runners' IPs are on a blocklist** at the AWS network level
3. **NAT translation issues** (instance is behind NAT with private IP 172.26.14.44)
4. **AWS Shield or AWS WAF** inadvertently blocking GitHub's IP ranges

## Alternative Solutions

### Option 1: GitHub Self-Hosted Runner (RECOMMENDED)
Deploy a self-hosted runner on the Lightsail instance itself:

```bash
# On server
cd /opt
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux.tar.gz
./config.sh --url https://github.com/AutonomosCdM/smartFarm --token <TOKEN>
sudo ./svc.sh install
sudo ./svc.sh start
```

**Pros:**
- No SSH needed from GitHub
- Faster deployments (local)
- No network restrictions

**Cons:**
- Requires runner maintenance
- Uses server resources

### Option 2: AWS Systems Manager Session Manager
Use AWS SSM instead of SSH:

```yaml
- name: Execute via SSM
  run: |
    aws ssm send-command \
      --instance-ids "i-xxxxx" \
      --document-name "AWS-RunShellScript" \
      --parameters 'commands=["cd /opt/smartfarm && ./deployment/deploy.sh"]'
```

**Pros:**
- No open SSH port needed
- IAM-based authentication
- Works through AWS network

**Cons:**
- Requires SSM agent on instance
- More complex setup

### Option 3: Webhook-Based Deployment
Set up a webhook listener on the server:

1. Server runs a simple webhook service
2. GitHub Actions triggers webhook
3. Server pulls and deploys

**Pros:**
- Simple to implement
- No SSH from GitHub

**Cons:**
- Need to secure webhook endpoint
- Additional service to maintain

### Option 4: VPN/Bastion Host
Route GitHub Actions through a known IP:

```yaml
- name: Connect via VPN
  run: |
    # Connect to VPN or bastion with static IP
    # Then SSH from there
```

**Pros:**
- Works with current setup
- Can whitelist single IP

**Cons:**
- Additional infrastructure cost
- More complex workflow

## Recommended Next Steps

1. **SHORT TERM:** Implement GitHub Self-Hosted Runner
   - Fastest solution
   - No network restrictions
   - Better performance

2. **LONG TERM:** Investigate AWS Support ticket
   - Ask AWS about Lightsail network filtering
   - Request whitelist for GitHub Actions IP ranges
   - Understand if Lightsail has hidden ACLs

3. **ALTERNATIVE:** Switch to EC2 if Lightsail limitations persist
   - EC2 offers full VPC control
   - More transparent networking
   - Better for production deployments

## Testing Commands

### Local Testing (Verify server is accessible)
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "echo 'test'"
```

### Check SSH Logs for Connection Attempts
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo journalctl -u ssh --since '5 minutes ago' --no-pager"
```

### Check fail2ban Status
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client status sshd"
```

### View Lightsail Firewall Rules
```bash
aws lightsail get-instance-port-states --instance-name smartfarm --region us-east-1
```

## Status: BLOCKED

**Conclusion:** GitHub Actions cannot SSH to AWS Lightsail due to network-level restrictions outside our control. Recommend implementing self-hosted runner as workaround.

**Date:** 2025-10-19
**Investigator:** Claude Code (SmartFarm DevOps Agent)
