test_cases = {
    "50  300  有买有卖调正万1 的d": ["沪50 当月 万1 call", "沪300 当月 万1 call"],
    "50 有买有卖 调正 万1  的d": ["沪50 当月 万1 call"],
    "500 有卖有买 调正万1  0.5 的d": ["沪500 当月 万1 call", "深500 当月 万0.5 call"],
    "深圳300 下月有买有卖调正 万1 的d": ["深300 下月 万1 call"],
    "500  有买有卖 调负万1  0.5 的d": ["沪500 当月 万1 put", "深500 当月 万0.5 put"],
    "创业板 有买有卖 当月下月  调负 千1 0.5 的d": ["创业板 当月 千1 put", "创业板 下月 千0.5 put"],
    "创业板当月下月 有买有卖 调负 各万1 的d": ["创业板 当月 万1 put", "创业板 下月 万1 put"],
    "科创50 80 有买有卖调正万1 0.6 的d": ["科创50 当月 万1 call", "科创80 当月 万0.6 call"],
    "IH 有卖有买 调正 万2 的d": ["IH 当月 万2 call"],
    "科创50 80 有买有卖 调正 1 0.5份": ["科创50 当月 份1 call", "科创80 当月 份0.5 call"],
    "科创50  有买有卖 调正 1份": ["科创50 当月 份1 call"],
    "深圳300 下月有买有卖调负 1 份": ["深300 下月 份1 put"],
}
EXAMPLE_CASES = list(test_cases.keys())


def parse_dual_side_delta_instructions(instruction):
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

    # assert "有买有卖" in instruction or "有卖有买" in instruction, f"Instruction should contain '有买有卖', '有卖有买': {instruction}"

    target_simplified_mapping = {
        "80": "科创80",
        "50": "沪50",
        "100": "深100",
        "深圳500": "深500",
        "深圳300": "深300",
        "深圳100": "深100",
    }
    targets = re.findall(r'(沪500|沪300|沪50|科创50|科创80|深圳500|深圳300|深圳100|深500|深300|深100|创业板|500|300|100|80|50|IH|IF|IC|IM)', instruction)
    targets = [target_simplified_mapping.get(target, target) for target in targets]
    months = re.findall(r'(当月|下月|下季|隔季)', instruction)
    if "份" in instruction:
        exs, unit = re.findall(r'([0-9\.\s]+)(份)', instruction)[0]
    else:
        unit, exs = re.findall(r'(千|万)([0-9\.\s]+)', instruction)[0]
    exposures = [unit + exposure for exposure in exs.split()]

    option_type = ""
    if '调正' in instruction:
        option_type = 'call'
    if '调负' in instruction:
        option_type = 'put'
    assert option_type in ['call', 'put'], f"Option type should be either 'call' or 'put': {instruction}"

    # 处理特殊规则
    results = []
    if '各' in instruction:
        assert len(targets) == 1, f"Targets should have only one element: {targets}"
        assert len(exposures) == 1, f"Exposures should have only one element: {exposures}"
        assert len(months) > 1, f"Months should have more than one element: {months}"
        for month in months:
            target = get_target_mapping(targets[0], 1)[0]
            results.append(f"{target} {month} {exposures[0]} {option_type}")
    else:
        if len(months) == 0:
            months = ['当月']

        # 一个月份，一个敞口，一个标的
        if len(months) == len(exposures) == 1:
            # assert len(targets) == 1, f"Targets should have only one element: {targets}"
            targets = [get_target_mapping(target, 1)[0] for target in targets]
            for target in targets:
                results.append(f"{target} {months[0]} {exposures[0]} {option_type}")
        elif len(months) == 1:
            # 一个月份，标的数量和敞口相等，则一一对应，如果标的在target_mapping中，则使用对应的带沪标的
            if len(targets) == len(exposures):
                targets = [get_target_mapping(target, 1)[0] for target in targets]
                for target, exposure in zip(targets, exposures):
                    results.append(f"{target} {months[0]} {exposure} {option_type}")

            if len(targets) < len(exposures):
                # 一个月份，标的数量比敞口数量少，说明标的中有300,500，需要拆分
                new_targets = []
                for target in targets:
                    new_targets.extend(get_target_mapping(target, 2))
                assert len(new_targets) == len(
                    exposures), f"Targets and exposures should have the same length: {new_targets} vs {exposures}"
                for target, exposure in zip(new_targets, exposures):
                    results.append(f"{target} {months[0]} {exposure} {option_type}")
        elif len(months) > 1:
            assert len(targets) == 1, f"Targets should have only one element: {targets}"
            targets = [get_target_mapping(target, 1)[0] for target in targets]
            for month, exposure in zip(months, exposures):
                results.append(f"{targets[0]} {month} {exposure} {option_type}")
    return results


def test_parse_delta_instructions():
    for instruction, expected in test_cases.items():
        result = parse_dual_side_delta_instructions(instruction)
        assert result == expected, f"Failed on {instruction}: {result} != {expected}"
        print(f"Passed on {instruction}: {result} == {expected}")

    print("All test cases passed!")


if __name__ == "__main__":
    test_parse_delta_instructions()



