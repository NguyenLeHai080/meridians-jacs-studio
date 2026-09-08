import subprocess

try:
    cmd = 'powershell -Command "Get-Process -Id 5760 | Select-Object -ExpandProperty Path"'
    path = subprocess.check_output(cmd, shell=True).decode('cp1252', errors='ignore').strip()
    print("EXECUTABLE PATH:", path)
except Exception as e:
    print("ERR:", e)
