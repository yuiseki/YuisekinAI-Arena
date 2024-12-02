
all: sort tasks

sort: tmp/sorted_models.txt
	@sort -t: -k2,2n models.txt > tmp/sorted_models.txt

.PHONY: tasks
tasks:
	@./eval_models.sh
