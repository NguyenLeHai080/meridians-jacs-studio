import os
import sys
import io
import shutil
import subprocess
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")
STAGING_DIR = os.path.join(RELEASE_DIR, "asar_staging")

print("1. Preparing asar staging folder...")
if os.path.exists(STAGING_DIR):
    shutil.rmtree(STAGING_DIR)
os.makedirs(STAGING_DIR, exist_ok=True)

# Copy dist
shutil.copytree(os.path.join(APP_DIR, "dist"), os.path.join(STAGING_DIR, "dist"))
# Copy electron
shutil.copytree(os.path.join(APP_DIR, "electron"), os.path.join(STAGING_DIR, "electron"))
# Copy package.json
shutil.copy2(os.path.join(APP_DIR, "package.json"), os.path.join(STAGING_DIR, "package.json"))

print("2. Packing app.asar...")
asar_out = os.path.join(RELEASE_DIR, "app.asar")
cmd = f'npx asar pack "{STAGING_DIR}" "{asar_out}"'
subprocess.check_call(cmd, shell=True, cwd=APP_DIR)
print(f"✅ Generated app.asar ({os.path.getsize(asar_out) / 1024 / 1024:.2f} MB)")

print("3. Closing running JACS Studio processes...")
subprocess.call('taskkill /F /IM "JACS Studio.exe"', shell=True)
time.sleep(1)

install_asar = r"D:\Program Files\JACS Studio\resources\app.asar"
if os.path.exists(os.path.dirname(install_asar)):
    try:
        shutil.copy2(asar_out, install_asar)
        print(f"✅ Copied to {install_asar}")
    except Exception as e:
        print(f"❌ Failed to copy to {install_asar}: {e}")

print("4. Relaunching JACS Studio.exe...")
exe_path = r"D:\Program Files\JACS Studio\JACS Studio.exe"
if os.path.exists(exe_path):
    subprocess.Popen([exe_path], close_fds=True)
    print("🚀 Successfully launched JACS Studio!")
