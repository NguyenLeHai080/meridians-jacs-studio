import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

stdin, stdout, stderr = ssh.exec_command('ls -la /var/www/downloads/ || ls -la /opt/jacs-studio/releases/ || ls -la /usr/share/nginx/html/downloads/')
out = stdout.read().decode('utf-8', errors='ignore')
print("Server downloads dir:\n", out.encode('ascii', errors='ignore').decode('ascii'))

stdin, stdout, stderr = ssh.exec_command('find / -name "*v0.8.28*" 2>/dev/null | head -n 10')
out2 = stdout.read().decode('utf-8', errors='ignore')
print("Found v0.8.28 files:\n", out2.encode('ascii', errors='ignore').decode('ascii'))

ssh.close()
