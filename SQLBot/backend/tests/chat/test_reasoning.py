import os

import yaml


def test_template_includes_reasoning_instruction():
    path = os.path.join(os.path.dirname(__file__), "../../templates/template.yaml")
    with open(path) as f:
        template = yaml.safe_load(f)
    assert "reasoning" in template, "template.yaml 缺少 reasoning 指令"
    assert "instruction" in template["reasoning"]
    assert "时间范围" in template["reasoning"]["instruction"]


def test_template_removes_ban_on_clarification():
    path = os.path.join(os.path.dirname(__file__), "../../templates/template.yaml")
    with open(path) as f:
        content = f.read()
    assert "禁止要求额外信息" not in content
    assert "即使查询条件不完整" not in content
