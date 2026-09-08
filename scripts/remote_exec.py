import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def run_remote(cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('221.121.1.3', 22, 'root', '4fT0R%GUJgh@a9Vw')
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else 'uptime'
    out, err = run_remote(command)
    print("STDOUT:\n" + out)
    if err:
        print("STDERR:\n" + err)
