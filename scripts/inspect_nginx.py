import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

stdin, stdout, stderr = ssh.exec_command('cat /etc/nginx/sites-enabled/* || cat /etc/nginx/conf.d/* || true')
print("=== NGINX SITES ===")
print(stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('find /root /opt /home /var/www -maxdepth 3 -name "*jacs*" -o -name "*meridian*"')
print("=== FOLDERS ===")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
