import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

script = """
from app.core.store import store

releases = store.list("releases")
print("COUNT RELEASES:", len(releases))
for r in releases:
    print(r.get("version"), r.get("status"), r.get("channel"), r.get("platform"))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/check_rel.py', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/check_rel.py jacs-studio-prod-api-1:/tmp/check_rel.py && docker exec jacs-studio-prod-api-1 python /tmp/check_rel.py')
print("OUTPUT:")
print(stdout.read().decode('utf-8', errors='ignore'))
ssh.close()
