test_cases = {
    "科创50 80 卖出  0.85p  万0.3的d": ["科创50 当月 万0.3 卖 put-0.85", "科创80 当月 万0.3 卖 put-0.85"],
    "科创50  80 买    0.8c 万0.3 的d": ["科创50 当月 万0.3 买 call-0.8", "科创80 当月 万0.3 买 call-0.8"],
    "科创50  80 卖出  当月   0.85p  万0.3 的d": ["科创50 当月 万0.3 卖 put-0.85", "科创80 当月 万0.3 卖 put-0.85"],
    "科创50  80 卖出   0.85p  万0.2 的d下月": ["科创50 下月 万0.2 卖 put-0.85", "科创80 下月 万0.2 卖 put-0.85"],
    "50 买  2.5c  万0.2 的d  下月": ["沪50 下月 万0.2 买 call-2.5"],
    "深圳300 买   3.6p  万0.2 的d": ["深300 当月 万0.2 买 put-3.6"],
    "500 买  5.5c  当月下月各万0.2 的d": ["沪500 当月 万0.2 买 call-5.5", "沪500 下月 万0.2 买 call-5.5"],
    "卖 500  5.5c  万0.2 0.3 的d": ["沪500 当月 万0.2 卖 call-5.5", "深500 当月 万0.3 卖 call-5.5"],
    "IH 卖 2450p 万2 的d": ["IH 当月 万2 卖 put-2450"],
    "科创50 卖出 0.7c  0.75c 千0.3d": ["科创50 当月 千0.3 卖 call-0.7", "科创50 当月 千0.3 卖 call-0.75"],
    "卖出科创50  0.7c  0.75c 万0.3  0.5 d": ["科创50 当月 万0.3 卖 call-0.7", "科创50 当月 万0.5 卖 call-0.75"],
}
EXAMPLE_CASES = list(test_cases.keys())


def parse_fixed_strike_delta_instructions(instruction):
    import re

    # 定义基本的映射和数据
    target_mapping = {
        '300': ['沪300', '深300'],
        '500': ['沪500', '深500'],
    }

    def get_target_mapping(target, return_num: int = 1):
        if target not in target_mapping:
            return [target]
        else:
            return target_mapping[target][:return_num]

    action_mapping = {'买入': '买', '卖出': '卖'}
    target_simplified_mapping = {
        "80": "科创80",
        "50": "沪50",
        "100": "深100",
        "深圳500": "深500",
        "深圳300": "深300",
        "深圳100": "深100",
        }

    # 提取基本信息
    action = re.findall(r'(买|买入|卖|卖出)', instruction)[0]
    action = action_mapping.get(action, action)

    # 使用正则表达式找到c或p前的数字
    matches = re.findall(r'(\d+\.?\d*)([cp])', instruction)
    assert len(matches) >= 1, f"Strick should have least one element: {matches}"
    option_symbols = []
    for match in matches:
        strick = match[0]
        option_symbol = 'call-' + strick if 'c' in match[1] else 'put-' + strick
        option_symbols.append(option_symbol)
        instruction = re.sub(r'\d+\.?\d*[cp]', '', instruction)

    targets = re.findall(r'(沪500|沪300|沪50|科创50|科创80|深圳500|深圳300|深圳100|深500|深300|深100|创业板|500|300|100|80|50|IH|IF|IC|IM)', instruction)
    targets = [target_simplified_mapping.get(target, target) for target in targets]
    months = re.findall(r'(当月|下月|下季|隔季)', instruction)
    unit, exs = re.findall(r'(千|万)([0-9\.\s]+)', instruction)[0]
    exposures = [unit + exposure for exposure in exs.split()]

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
                    results.append(f"{target} {month} {exposures[0]} {action} {option_symbol}")
        else:
            if len(months) == 0:
                months = ['当月']

            # 一个月份，一个敞口
            if len(months) == len(exposures) == 1:
                # assert len(targets) == 1, f"Targets should have only one element: {targets}"
                targets = [get_target_mapping(target, 1)[0] for target in targets]
                for target in targets:
                    results.append(f"{target} {months[0]} {exposures[0]} {action} {option_symbol}")
            elif len(months) == 1:
                # 一个月份，标的数量和敞口相等，则一一对应，如果标的在target_mapping中，则使用对应的带沪标的
                if len(targets) == len(exposures):
                    targets = [get_target_mapping(target, 1)[0] for target in targets]
                    for target, exposure in zip(targets, exposures):
                        results.append(f"{target} {months[0]} {exposure} {action} {option_symbol}")

                if len(targets) < len(exposures):
                    # 一个月份，标的数量比敞口数量少，说明标的中有300,500，需要拆分
                    new_targets = []
                    for target in targets:
                        new_targets.extend(get_target_mapping(target, 2))
                    assert len(new_targets) == len(
                        exposures), f"Targets and exposures should have the same length: {new_targets} vs {exposures}"
                    for target, exposure in zip(new_targets, exposures):
                        results.append(f"{target} {months[0]} {exposure} {action} {option_symbol}")
            elif len(months) > 1:
                assert len(targets) == 1, f"Targets should have only one element: {targets}"
                targets = [get_target_mapping(target, 1)[0] for target in targets]
                for month, exposure in zip(months, exposures):
                    results.append(f"{targets[0]} {month} {exposure} {action} {option_symbol}")
    else:
        # 多个option_symbol,只处理一个target,一个月份
        targets = [get_target_mapping(target, 1)[0] for target in targets]
        assert len(targets) == 1, f"Targets should have only one element: {targets}"
        if len(months) == 0:
            months = ['当月']
        assert len(months) == 1, f"Months should have only one element: {months}"
        if len(exposures) == len(option_symbols):
            for option_symbol, exposure in zip(option_symbols, exposures):
                results.append(f"{targets[0]} {months[0]} {exposure} {action} {option_symbol}")
        else:
            assert len(exposures) == 1, f"Exposures should have only one element: {exposures}"
            for option_symbol in option_symbols:
                results.append(f"{targets[0]} {months[0]} {exposures[0]} {action} {option_symbol}")
    return results


def test_parse_delta_instructions():
    for instruction, expected in test_cases.items():
        result = parse_fixed_strike_delta_instructions(instruction)
        assert result == expected, f"Failed on {instruction}: {result} != {expected}"
        print(f"Passed on {instruction}: {result} == {expected}")

    print("All test cases passed!")


if __name__ == "__main__":
    test_parse_delta_instructions()
