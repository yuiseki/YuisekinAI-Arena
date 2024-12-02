#!/bin/bash

echo ""

# ./tasks/001/prompt.txt の内容を出力
echo -e "\e[43;30m RUNS \e[0m Prompt: $(cat ./tasks/001/prompt.txt)"

# モデル名一覧を取得してeval.shに渡す
cat ./tmp/sorted_models.txt | xargs -P1 -I{} ./eval.sh {}