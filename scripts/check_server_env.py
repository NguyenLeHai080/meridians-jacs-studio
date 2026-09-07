import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

stdin, stdout, stderr = ssh.exec_command('docker ps')
print('=== DOCKER CONTAINERS ===')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec jacs-studio-prod-api-1 env || docker exec jacs-api-server env || docker ps')
print('=== API ENV ===')
print(stdout.read().decode())

ssh.close()
