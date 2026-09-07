import urllib.request
import hashlib
import ssl
import os
import sys
import io
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ctx = ssl._create_unverified_context()
url = "https://jacs-studio.nexoratech.com.vn/downloads/JACS-Studio-Setup-v0.8.28.exe"
print("Downloading from URL...")
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
data = urllib.request.urlopen(req, context=ctx).read()
url_sha512 = hashlib.sha512(data).hexdigest()
print(f"URL Downloaded size: {len(data)} bytes")
print(f"URL SHA-512:        {url_sha512}")

local_path = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\FE\desktop-app\release\JACS-Studio-Setup-v0.8.28.exe"
with open(local_path, "rb") as f:
    local_data = f.read()
local_sha512 = hashlib.sha512(local_data).hexdigest()
print(f"Local file size:     {len(local_data)} bytes")
print(f"Local SHA-512:       {local_sha512}")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("221.121.1.3", port=22, username="root", password=r"4fT0R%GUJgh@a9Vw")
stdin, stdout, stderr = ssh.exec_command("sha512sum /opt/jacs-studio/downloads/JACS-Studio-Setup-v0.8.28.exe")
print(f"Remote file sha512:  {stdout.read().decode('utf-8').strip()}")

stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:84/api/v1/releases/check?platform=windows&current_version=v0.8.27&channel=stable'")
print(f"API returns:         {stdout.read().decode('utf-8').strip()}")
ssh.close()
