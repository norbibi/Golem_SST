#!/bin/sh

export PYENV_ROOT="/root/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
export XDG_CACHE_HOME=/root/huggingface
export USE_EXPRESSIVE_MODEL=1

eval "$(pyenv init -)"
pyenv activate sst
cd /root/seamless-streaming/seamless_server
uvicorn app_pubsub:app --host 0.0.0.0 --port 8000 &
uvicorn app_pubsub:app --host 0.0.0.0 --port 8001 &
