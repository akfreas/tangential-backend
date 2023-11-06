  # This script launches everything totally local, with no connection to external AWS or ES resources
# Start required services with docker-compose up in backend dir

set -e
export LOCAL_HTTP_PROXY=http://localhost:8081

./setup_resources.py --stage offline
cd ..
sls offline start --reloadHandler --stage offline --httpPort 3001
