import os
import subprocess
import shutil

prog_dir = r"C:\Users\NguyenLeHai\AppData\Local\Programs\jacs-studio"
asar_file = os.path.join(prog_dir, "resources", "app.asar")
src_asar = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\FE\desktop-app\release\app.asar"

print("1. Kill old processes...")
subprocess.call('taskkill /F /IM "JACS Studio.exe"', shell=True)

print("2. Checking files...")
print("Source asar size:", os.path.getsize(src_asar))

print("3. Copying new asar...")
shutil.copy2(src_asar, asar_file)
print("Copied asar size:", os.path.getsize(asar_file))

print("4. Listing files in copied asar...")
out = subprocess.check_output(f'npx asar list "{asar_file}"', shell=True, cwd=r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\FE\desktop-app")
print(out.decode('utf-8', errors='ignore')[:300])

print("5. Launching updated JACS Studio.exe...")
exe_path = os.path.join(prog_dir, "JACS Studio.exe")
subprocess.Popen([exe_path], close_fds=True)
print("✅ Launched!")
