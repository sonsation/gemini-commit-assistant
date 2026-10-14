#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

interactive_menu() {
    local prompt="$1"
    local -n options_ref=$2
    local default_idx=${3:-0}
    
    local selected=$default_idx
    local input_buffer=""
    
    tput civis # 커서 숨기기
    
    render() {
        echo -e "${CYAN}$prompt${NC}"
        if [ -n "$input_buffer" ]; then
            echo -e "  ${YELLOW}입력중: $input_buffer${NC}"
        fi
        
        for i in "${!options_ref[@]}"; do
            local num=$((i+1))
            if [ "$i" -eq "$selected" ]; then
                echo -e "  ${GREEN}▶ $num. ${options_ref[$i]}${NC}"
            else
                echo -e "    $num. ${options_ref[$i]}"
            fi
        done
    }
    
    clear_and_render() {
        local lines=${#options_ref[@]}
        ((lines += 1))
        if [ -n "$input_buffer" ] || [ "$1" = "had_buffer" ]; then
            ((lines += 1))
        fi
        
        tput cuu $lines
        tput ed
        
        render
    }
    
    render
    local had_buffer="false"
    
    while true; do
        read -rsn1 key
        
        if [[ $key == $'\x1b' ]]; then
            read -rsn2 -t 0.1 ext
            if [[ $ext == "[A" ]]; then # Up
                ((selected--))
                if [ $selected -lt 0 ]; then selected=$((${#options_ref[@]} - 1)); fi
                input_buffer=""
            elif [[ $ext == "[B" ]]; then # Down
                ((selected++))
                if [ $selected -ge ${#options_ref[@]} ]; then selected=0; fi
                input_buffer=""
            fi
        elif [[ $key == "" ]]; then # Enter
            break
        elif [[ $key == $'\x7f' || $key == $'\b' ]]; then # Backspace
            input_buffer="${input_buffer%?}"
        else
            input_buffer="${input_buffer}${key}"
            for i in "${!options_ref[@]}"; do
                if [ "$((i+1))" = "$input_buffer" ]; then
                    selected=$i
                fi
            done
        fi
        
        clear_and_render "$had_buffer"
        if [ -n "$input_buffer" ]; then
            had_buffer="true"
        else
            had_buffer="false"
        fi
    done
    
    tput cnorm
    MENU_RESULT=$selected
    
    local lines=${#options_ref[@]}
    ((lines += 1))
    [ "$had_buffer" = "true" ] && ((lines += 1))
    tput cuu $lines
    tput ed
    echo -e "${CYAN}$prompt${NC} ${GREEN}${options_ref[$MENU_RESULT]}${NC}"
}

opts=("Apple" "Banana" "Cherry" "Dates")
interactive_menu "Select a fruit:" opts 1
echo "Selected index: $MENU_RESULT"
