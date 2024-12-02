#!/bin/bash

# ファイルパスを引数として取得
FILE1=$1
FILE2=$2

# ファイルが存在するか確認
if [ ! -f "$FILE1" ] || [ ! -f "$FILE2" ]; then
    echo "どちらかのファイルが存在しません。"
    exit 1
fi

# レーベンシュタイン編集距離を計算する関数
levenshtein() {
    awk '
    function min3(a, b, c) {
        return (a <= b && a <= c) ? a : (b <= a && b <= c) ? b : c
    }
    BEGIN {
        FS = ""
        OFS = ""
        getline s1 < ARGV[1]
        getline s2 < ARGV[2]
        delete ARGV[1]
        delete ARGV[2]
        len1 = length(s1)
        len2 = length(s2)
        for (i = 1; i <= len1; i++) {
            d[i, 0] = i
        }
        for (j = 1; j <= len2; j++) {
            d[0, j] = j
        }
        for (i = 1; i <= len1; i++) {
            for (j = 1; j <= len2; j++) {
                cost = (substr(s1, i, 1) == substr(s2, j, 1)) ? 0 : 1
                d[i, j] = min3(d[i-1, j] + 1, d[i, j-1] + 1, d[i-1, j-1] + cost)
            }
        }
        print d[len1, len2]
    }' "$1" "$2"
}

# レーベンシュタイン編集距離を計算して出力
EDIT_DISTANCE=$(levenshtein "$FILE1" "$FILE2")
echo "$EDIT_DISTANCE"