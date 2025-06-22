test_cases = {
    "科创50 80 0.85p  平20%": ["科创50 当月 put-0.85 平20%", "科创80 当月 put-0.85 平20%"],
    "科创50  80   0.8c 平100%": ["科创50 当月 call-0.8 平100%", "科创80 当月 call-0.8 平100%"],
    "科创50  80  当月   0.85p  清掉": ["科创50 当月 put-0.85 平100%", "科创80 当月 put-0.85 平100%"],
    "科创50  80  0.85p  清仓下月": ["科创50 下月 put-0.85 平100%", "科创80 下月 put-0.85 平100%"],
    "50  2.5c  清20%": ["沪50 当月 call-2.5 平20%"],
    "300  当月 3.6p  平30% 50%": ["沪300 当月 put-3.6 平30%", "深300 当月 put-3.6 平50%"],
    "500 深500 3.6p 平20% 30%": ["沪500 当月 put-3.6 平20%", "深500 当月 put-3.6 平30%"],
    "500  5.5c  当月下月各清20%": ["沪500 当月 call-5.5 平20%", "沪500 下月 call-5.5 平20%"],
    "500  5.5c  平20% 30%": ["沪500 当月 call-5.5 平20%", "深500 当月 call-5.5 平30%"],
    "500 5.5p 当月下月 清20% 20%": ["沪500 当月 put-5.5 平20%", "沪500 下月 put-5.5 平20%"],
    "500 5.5p 5.5c 清20% 30%": ["沪500 当月 put-5.5 平20%", "沪500 当月 call-5.5 平30%"],
    "500 5.5p 5.5c 平20%": ["沪500 当月 put-5.5 平20%", "沪500 当月 call-5.5 平20%"],
    "IH 2450p 平20%": ["IH 当月 put-2450 平20%"],
}
EXAMPLE_CASES = list(test_cases.keys())


def parse_clear_strike_option_instructions(instruction):
    import re

    # 定义基本的映射和数据
    target_mapping = {
        '300': ['沪300', '深300'],
        '500': ['沪500', '深500']
    }

    def get_target_mapping(target, return_num: int = 1):
        if target not in target_mapping:
            return [target]
        else:
            return target_mapping[target][:return_num]

    target_simplified_mapping = {
        "80": "科创80",
        "50": "沪50",
        "100": "深100",
        "深圳500": "深500",
        "深圳300": "深300",
        "深圳100": "深100",
        }

    # 提取基本信息
    action = "平"

    # 使用正则表达式找到c或p前的数字
    matches = re.findall(r'(\d+\.?\d*)([cp])', instruction)
    assert len(matches) >= 1, f"Strick should have least one element: {matches}"
    option_symbols = []
    for match in matches:
        strick = match[0]
        option_symbol = 'call-' + strick if 'c' in match[1] else 'put-' + strick
        option_symbols.append(option_symbol)
        instruction = re.sub(r'\d+\.?\d*[cp]', '', instruction)

    keywords = ['平', '清']
    if any(keyword in instruction for keyword in keywords) and "%" not in instruction:
        instruction += " 100%"
    exposures = [exposure + "%" for exposure in re.findall(r'(\d+\.?\d*)%', instruction)]
    instruction = re.sub(r'\d+\.?\d*%', '', instruction)

    targets = re.findall(r'(沪500|沪300|沪50|科创50|科创80|深圳500|深圳300|深圳100|深500|深300|深100|创业板|500|300|100|80|50|IH|IF|IC|IM)', instruction)
    targets = [target_simplified_mapping.get(target, target) for target in targets]
    months = re.findall(r'(当月|下月|下季|隔季)', instruction)

    # 处理特殊规则
    results = []
    if len(option_symbols) == 1:
        option_symbol = option_symbols[0]
        if '各' in instruction:
            # assert len(targets) == 1, f"Targets should have only one element: {targets}"
            assert len(exposures) == 1, f"Exposures should have only one element: {exposures}"
            # assert len(months) > 1, f"Months should have more than one element: {months}"
            for target in targets:
                for month in months:
                    target = get_target_mapping(target, 1)[0]
                    results.append(f"{target} {month} {option_symbol} {action}{exposures[0]}")
        else:
            if len(months) == 0:
                months = ['当月']

            # 一个月份，一个敞口，一个标的
            if len(months) == len(exposures) == 1:
                # assert len(targets) == 1, f"Targets should have only one element: {targets}"
                targets = [get_target_mapping(target, 1)[0] for target in targets]
                for target in targets:
                    results.append(f"{target} {months[0]} {option_symbol} {action}{exposures[0]}")
            elif len(months) == 1:
                # 一个月份，标的数量和敞口相等，则一一对应，如果标的在target_mapping中，则使用对应的带沪标的
                if len(targets) == len(exposures):
                    targets = [get_target_mapping(target, 1)[0] for target in targets]
                    for target, exposure in zip(targets, exposures):
                        results.append(f"{target} {months[0]} {option_symbol} {action}{exposure}")

                if len(targets) < len(exposures):
                    # 一个月份，标的数量比敞口数量少，说明标的中有300,500，需要拆分
                    new_targets = []
                    for target in targets:
                        new_targets.extend(get_target_mapping(target, 2))
                    assert len(new_targets) == len(
                        exposures), f"Targets and exposures should have the same length: {new_targets} vs {exposures}"
                    for target, exposure in zip(new_targets, exposures):
                        results.append(f"{target} {months[0]} {option_symbol} {action}{exposure}")
            elif len(months) > 1:
                assert len(targets) == 1, f"Targets should have only one element: {targets}"
                targets = [get_target_mapping(target, 1)[0] for target in targets]
                for month, exposure in zip(months, exposures):
                    results.append(f"{targets[0]} {month} {option_symbol} {action}{exposure}")
    else:
        # 多个option_symbol,只处理一个target,一个月份
        targets = [get_target_mapping(target, 1)[0] for target in targets]
        assert len(targets) == 1, f"Targets should have only one element: {targets}"
        if len(months) == 0:
            months = ['当月']
        assert len(months) == 1, f"Months should have only one element: {months}"
        if len(exposures) == len(option_symbols):
            for option_symbol, exposure in zip(option_symbols, exposures):
                results.append(f"{targets[0]} {months[0]} {option_symbol} {action}{exposure}")
        else:
            assert len(exposures) == 1, f"Exposures should have only one element: {exposures}"
            for option_symbol in option_symbols:
                results.append(f"{targets[0]} {months[0]} {option_symbol} {action}{exposures[0]}")
    return results


def test_parse_clear_instructions():
    for instruction, expected in test_cases.items():
        result = parse_clear_strike_option_instructions(instruction)
        assert result == expected, f"Failed on {instruction}: {result} != {expected}"
        print(f"Passed on {instruction}: {result} == {expected}")

    print("All test cases passed!")


if __name__ == "__main__":
    test_parse_clear_instructions()
