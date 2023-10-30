  # This script launches everything totally local, with no connection to external AWS or ES resources
# Start required services with docker-compose up in backend dir

set -e

./setup_resources.py --stage offline
cd ..
sls offline start --reloadHandler --stage offline --httpPort 3001