#!/bin/zsh
# usage: run.sh model variant n
S=$(cd "$(dirname "$0")" && pwd); m=$1; v=$2; n=$3
d=$S/runs/$m-$v-$n; mkdir -p $d/w; cd $d/w
cp $S/ops.mjs .
printf '#!/bin/sh\nexec node %s/ops.mjs "$@"\n' $d/w > ops; chmod +x ops
export OPS_VARIANT=$v OPS_LOG=$d/calls.jsonl
PATH=$d/w:$PATH claude -p "Use the \`ops\` CLI (on PATH) to find which service is unhealthy and fix it. Stop when the service is healthy again. Then reply with one line." --model $m --allowedTools Bash --disallowedTools "Read Write Edit Glob Grep WebFetch WebSearch Agent" --output-format json --setting-sources "" --max-turns 15 > $d/out.json 2> $d/err.txt
