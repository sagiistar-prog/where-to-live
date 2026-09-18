import unittest
from collect import select_section


class SectionTests(unittest.TestCase):
    def test_only_selected_housing_section_is_kept(self):
        text = '导航\n住房问题\n合同信息须更新。\n医疗问题\n与住房无关。'
        section = {'label': '住房问答', 'start': '住房问题', 'end': '医疗问题'}
        self.assertEqual(select_section(text, section), '住房问题\n合同信息须更新。')
        self.assertEqual(select_section(text, None), text)

    def test_missing_repeated_and_reversed_markers_fail_closed(self):
        section = {'label': 'fixture', 'start': 'START', 'end': 'END'}
        for text in ('START body', 'END body START', 'START START END', 'START END END'):
            with self.assertRaises(ValueError):
                select_section(text, section)
