#!/bin/bash

# 引数からモデル名を取得
MODEL_NAME=$1

# tmp/MODEL_NAME/tasks/001 にディレクトリを作成
mkdir -p ./tmp/$MODEL_NAME/tasks/001

# 何回成功したかを保存する変数
PASS_COUNT=0

for i in {1..10}; do
    # ollamaを実行して結果を保存
    ollama run $MODEL_NAME "$(cat ./tasks/001/prompt.txt)" > ./tmp/$MODEL_NAME/tasks/001/answers.txt

    # 空行と行の先頭と末尾のスペースを削除
    sed -i '/^$/d' ./tmp/$MODEL_NAME/tasks/001/answers.txt
    sed -i 's/^[ \t]*//;s/[ \t]*$//' ./tmp/$MODEL_NAME/tasks/001/answers.txt
    # 末尾の.も削除
    sed -i 's/\.$//' ./tmp/$MODEL_NAME/tasks/001/answers.txt

    # 直前のコマンドの出力を ./tasks/001/answers.txt と比較する
    diff ./tmp/$MODEL_NAME/tasks/001/answers.txt ./tasks/001/answers.txt > /dev/null

    # diffコマンドの終了コードを取得
    DIFF_EXIT_CODE=$?

    # 終了コードに応じた処理
    if [ $DIFF_EXIT_CODE -eq 0 ]; then
        PASS_COUNT=$((PASS_COUNT + 1))
    elif [ $DIFF_EXIT_CODE -eq 1 ]; then
        echo -e "\t\e[43;30m DIFF \e[0m\t\t$MODEL_NAME"
        echo -e "\tExpected:\t$(cat ./tasks/001/answers.txt)"
        echo -e "\tActual:\t\t$(cat ./tmp/$MODEL_NAME/tasks/001/answers.txt)"
        # レーベンシュタイン編集距離を計算して出力
        EDIT_DISTANCE=$(./levenshtein.sh ./tmp/$MODEL_NAME/tasks/001/answers.txt ./tasks/001/answers.txt)
        echo -e "\tDISTANCE: $EDIT_DISTANCE"
    else
        echo -e "\t\e[41;37m ERROR \e[0m $MODEL_NAME"
    fi
done

# 何回成功したかを検証
# 10回中5回成功した場合はPASS
if [ $PASS_COUNT -ge 5 ]; then
    echo -e "\t\e[42;30m PASS \e[0m\t$MODEL_NAME"
else
    echo -e "\t\e[41;37m FAIL \e[0m\t$MODEL_NAME"
fi
