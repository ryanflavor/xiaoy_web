test_cases = {
    "50 双卖 当月 万1 的v": ["沪50 当月 万1 双卖vega"],
    "双卖 深500 万0.5 的v": ["深500 当月 万0.5 双卖vega"],
    "双买 500 下月 万1 的v": ["沪500 下月 万1 双买vega"],
    "双卖500  创业板当月各万0.5 的v": ["沪500 当月 万0.5 双卖vega", "创业板 当月 万0.5 双卖vega"],
    "双卖500  创业板当月万1 的v": ["沪500 当月 万1 双卖vega", "创业板 当月 万1 双卖vega"],
    "双买 500 当月和下月 各万0.5 的v": ["沪500 当月 万0.5 双买vega", "沪500 下月 万0.5 双买vega"],
    "创业板 双卖 当月和下月 万1 1.5 的v": ["创业板 当月 万1 双卖vega", "创业板 下月 万1.5 双卖vega"],
    "双卖 500 下月 万1 0.5的v": ["沪500 下月 万1 双卖vega", "深500 下月 万0.5 双卖vega"],
    "创业板 双买 下月 买万1的v": ["创业板 下月 万1 双买vega"],
    "双卖 500 创业板 当月 万1 0.5 1 的v": ["沪500 当月 万1 双卖vega", "深500 当月 万0.5 双卖vega", "创业板 当月 万1 双卖vega"],
    "IM 双卖 当月 千1 的v": ["IM 当月 千1 双卖vega"],
}


EXAMPLE_CASES = list(test_cases.keys())


def parse_vega_instructions(instruction):
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
    action = re.findall(r'(双买|双卖)', instruction)[0]
    targets = re.findall(r'(沪500|沪300|沪50|科创50|科创80|深圳500|深圳300|深圳100|深500|深300|深100|创业板|500|300|100|80|50|IH|IF|IC|IM)', instruction)
    targets = [target_simplified_mapping.get(target, target) for target in targets]
    months = re.findall(r'(当月|下月|下季|隔季)', instruction)
    unit, exs = re.findall(r'(千|万)([0-9\.\s]+)', instruction)[0]
    exposures = [unit + exposure for exposure in exs.split()]
    option_type = 'vega'
    assert 'v' in instruction, f"Instruction should contain 'v': {instruction}"

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


def test_parse_vega_instructions():
    for instruction, expected in test_cases.items():
        result = parse_vega_instructions(instruction)
        assert result == expected, f"Failed on {instruction}: {result} != {expected}"
        print(f"Passed on {instruction}: {result} == {expected}")

    print("All test cases passed!")


if __name__ == "__main__":
    test_parse_vega_instructions()

