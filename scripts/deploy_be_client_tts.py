import os
import sys
import paramiko
import time
import urllib.request

HOST = "221.121.1.3"
PORT = 22
USER = "root"
PASSWORD = "4fT0R%GUJgh@a9Vw"

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCAL_ROUTER = os.path.join(ROOT_DIR, "BE", "api-server", "app", "modules", "client", "router.py")

print("==================================================")
print("  DEPLOY BACKEND CLIENT TTS (WORD BOUNDARIES)     ")
print("==================================================")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=20)
sftp = ssh.open_sftp()

print("1. Uploading router.py to /tmp/client_router.py...")
sftp.put(LOCAL_ROUTER, "/tmp/client_router.py")

print("2. Copying into docker containers and restarting...")
cmd = """
docker cp /tmp/client_router.py jacs-studio-prod-api-1:/app/app/modules/client/router.py
docker cp /tmp/client_router.py jacs-studio-staging-api-1:/app/app/modules/client/router.py
docker restart jacs-studio-prod-api-1 jacs-studio-staging-api-1
"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("Stderr:", err)

sftp.close()
ssh.close()

print("3. Waiting 5s for containers to initialize...")
time.sleep(5)

print("4. Testing health endpoint...")
try:
    with urllib.request.urlopen("https://jacs-studio.nexoratech.com.vn/health/live", timeout=10) as resp:
        body = resp.read().decode('utf-8')
        print("Health status:", resp.status, body)
except Exception as e:
    print("Health check warning:", e)

print("\n✓ Hoàn tất deploy Backend Word Boundaries TTS!")
