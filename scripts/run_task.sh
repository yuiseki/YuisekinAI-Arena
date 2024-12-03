#!/bin/bash

# 引数からモデル名を取得
MODEL_NAME=$1

# 引数からタスク名を取得
TASK_NAME=$2

echo $MODEL_NAME
echo $TASK_NAME

# tmp/$MODEL_NAME/$TASK_NAME ディレクトリを作成
mkdir -p ./tmp/$MODEL_NAME/$TASK_NAME

