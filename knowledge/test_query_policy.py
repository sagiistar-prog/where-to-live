import unittest
from query_policy import query_boundary
from pipeline import diverse_results, evidence_answer, search


class HousingScopeTests(unittest.TestCase):
    def test_missing_capabilities_are_not_represented_as_answers(self):
        for query in ['帮我查今天上海小区的成交均价','明年房屋会升值吗','未上传协议可以判断有效吗','广州周末几点日落']:
            self.assertIsNotNone(query_boundary(query))
            self.assertEqual(evidence_answer(query,[])['answer_status'],'insufficient_evidence')

    def test_actual_rules_are_not_blocked_by_price_or_contract_words(self):
        for query in ['房东要求涨租，租金变更应如何约定','住房租赁合同应该包含哪些条款','公积金提取','监管资金缴纳方式','租金扣除标准','退租后押金处理','房东说明年涨价，合同应该怎么约定？','未提供合同就要求交押金，需要先核对什么？']:
            self.assertIsNone(query_boundary(query),query)

    def test_boundary_is_checked_before_embedding(self):
        class Encoder:
            def encode(self,*args,**kwargs):raise AssertionError('unexpected inference')
        self.assertEqual(search({},'明天北京的成交租金是多少',Encoder()),[])

    def test_one_long_source_cannot_occupy_every_result(self):
        records=[{'source_id':'a'},{'source_id':'a'},{'source_id':'a'},{'source_id':'b'}]
        self.assertEqual([i for i,_ in diverse_results([(0,4),(1,3),(2,2),(3,1)],records,3)],[0,1,3])


if __name__=='__main__':unittest.main()
