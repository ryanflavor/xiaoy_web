"""
需求描述：
开发一个Python函数，用以解析投资指令字符串，生成相应的一系列标的方向性敞口调整指令。
输入字符串通常以动作（如"买"、"买入"、"卖"、"卖出"）开头，
后跟标的信息[沪50，沪300，沪500，科创50，科创80，深100，深300，深500，创业板]、
月份[当月，下月，下季，隔季]和敞口信息（如"万1"）。
每条生成的指令应该只包含一个明确的标的和一个具体的月份。
特殊处理规则：
1. 标的信息的自动扩展：
当输入中的标的为"50"、"300"、"500"时，需要根据敞口数量自动扩展：
如果指令中包含多个敞口（即多个"万X"），则将"50"、"300"、"500"拆分为对应的"沪"和"深"两个标的。
如果指令中仅涉及一个敞口，则默认扩展为"沪"标的。
2. 月份和敞口的处理：
如果指令中包含多个月份并使用了"各"这一词汇，应为每个月份生成独立的调整指令。例如，"买500 当月和下月 各万0.5 的c"应生成两条指令，分别为当月和下月的买入操作，且每个月份只包括"沪500"。
如果指令中的月份和敞口没有使用"各"，则应按照提供的顺序匹配月份和敞口。例如，"卖 500 下月 万1 0.5的p"应生成两条指令，分别对应下月的两个不同敞口。
3. 期权类型的确定：
期权类型通过指令中的"的c"或"的p"确定，分别表示看涨期权（call）和看跌期权（put）。
4. 默认月份处理：
如果指令中未明确指定月份，应默认为"当月"。
输出格式：
每个输出字符串应遵循格式："{方向} {标的} {月份} {敞口} {期权类型}"，其中各字段之间应使用单个空格分隔。输出字符串中的期权类型应为"call"或"put"。

"""
test_cases = {
    "50  300  卖出 当月 万1 的p": ["沪50 当月 万1 卖put", "沪300 当月 万1 卖put"],
    "50 卖出 当月 万1 的p": ["沪50 当月 万1 卖put"],
    "深500 卖出 万0.5 的p": ["深500 当月 万0.5 卖put"],
    "500 买 下月 万1 的c": ["沪500 下月 万1 买call"],
    "500 卖出 创业板当月各万0.5 的c": ["沪500 当月 万0.5 卖call", "创业板 当月 万0.5 卖call"],
    "500 卖出 创业板当月万1 的c": ["沪500 当月 万1 卖call", "创业板 当月 万1 卖call"],
    "买500 买 当月和下月 各万0.5 的c": ["沪500 当月 万0.5 买call", "沪500 下月 万0.5 买call"],
    "创业板 卖出 当月和下月 万1 1.5 的p": ["创业板 当月 万1 卖put", "创业板 下月 万1.5 卖put"],
    "500 卖  下月 万1 0.5的p": ["沪500 下月 万1 卖put", "深500 下月 万0.5 卖put"],
    "创业板 下月 买万1的p": ["创业板 下月 万1 买put"],
    "500 创业板 卖出  当月 万1 0.5 1 的c": ["沪500 当月 万1 卖call", "深500 当月 万0.5 卖call", "创业板 当月 万1 卖call"],
    "IM 卖出 当月 千1 的c": ["IM 当月 千1 卖call"],
}

EXAMPLE_CASES = list(test_cases.keys())


def parse_single_side_delta_instructions(instruction):
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
    targets = re.findall(r'(沪500|沪300|沪50|科创50|科创80|深圳500|深圳300|深圳100|深500|深300|深100|创业板|500|300|100|80|50|IH|IF|IC|IM)', instruction)
    targets = [target_simplified_mapping.get(target, target) for target in targets]
    months = re.findall(r'(当月|下月|下季|隔季)', instruction)
    unit, exs = re.findall(r'(千|万)([0-9\.\s]+)', instruction)[0]
    exposures = [unit + exposure for exposure in exs.split()]
    option_type = 'call' if 'c' in instruction else 'put'

    # 处理特殊规则
    results = []
    if '各' in instruction:
        # assert len(targets) == 1, f"Targets should have only one element: {targets}"
        assert len(exposures) == 1, f"Exposures should have only one element: {exposures}"
        # assert len(months) > 1, f"Months should have more than one element: {months}"
        for target in targets:
            for month in months:
                target = get_target_mapping(target, 1)[0]
                results.append(f"{target} {month} {exposures[0]} {action}{option_type}")
    else:
        if len(months) == 0:
            months = ['当月']

        # 一个月份，一个敞口，一个标的
        if len(months) == len(exposures) == 1:
            # assert len(targets) == 1, f"Targets should have only one element: {targets}"
            targets = [get_target_mapping(target, 1)[0] for target in targets]
            for target in targets:
                results.append(f"{target} {months[0]} {exposures[0]} {action}{option_type}")
        elif len(months) == 1:
            # 一个月份，标的数量和敞口相等，则一一对应，如果标的在target_mapping中，则使用对应的带沪标的
            if len(targets) == len(exposures):
                targets = [get_target_mapping(target, 1)[0] for target in targets]
                for target, exposure in zip(targets, exposures):
                    results.append(f"{target} {months[0]} {exposure} {action}{option_type}")

            if len(targets) < len(exposures):
                # 一个月份，标的数量比敞口数量少，说明标的中有300,500，需要拆分
                new_targets = []
                for target in targets:
                    new_targets.extend(get_target_mapping(target, 2))
                assert len(new_targets) == len(
                    exposures), f"Targets and exposures should have the same length: {new_targets} vs {exposures}"
                for target, exposure in zip(new_targets, exposures):
                    results.append(f"{target} {months[0]} {exposure} {action}{option_type}")
        elif len(months) > 1:
            assert len(targets) == 1, f"Targets should have only one element: {targets}"
            targets = [get_target_mapping(target, 1)[0] for target in targets]
            for month, exposure in zip(months, exposures):
                results.append(f"{targets[0]} {month} {exposure} {action}{option_type}")
    return results


def test_parse_delta_instructions():
    for instruction, expected in test_cases.items():
        result = parse_single_side_delta_instructions(instruction)
        assert result == expected, f"Failed on {instruction}: {result} != {expected}"
        print(f"Passed on {instruction}: {result} == {expected}")

    print("All test cases passed!")


if __name__ == "__main__":
    test_parse_delta_instructions()

