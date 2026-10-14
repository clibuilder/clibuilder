#!/bin/zsh
# usage: run-q3.sh model help(large|absent) variant(help|next) n   (writes to $RUNS, default ./runs-q3)
S=$(cd "$(dirname "$0")" && pwd); m=$1; h=$2; v=$3; n=$4
d=${RUNS:-$S/runs-q3}/$m~$h~$v~$n; mkdir -p $d/w; cd $d/w
printf '#!/bin/sh\nexec node %s/svc.mjs "$@"\n' $S > svc; chmod +x svc
export SVC_VARIANT=$v SVC_HELP=$h SVC_LOG=$d/calls.jsonl
PATH=$d/w:$PATH claude -p "Use the \`svc\` CLI (on PATH) to find which service is unhealthy and fix it. Stop when the service is healthy again. Then reply with one line." --model $m --allowedTools Bash --disallowedTools "Read Write Edit Glob Grep WebFetch WebSearch Agent" --output-format json --setting-sources "" --max-turns 15 > $d/out.json 2> $d/err.txt
