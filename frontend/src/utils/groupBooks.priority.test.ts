// 代表の1冊を状態の順で選ぶことの単体テスト。テストケースの一覧は tests/borrowablePriority/cases.md
import { describe, expect, it } from 'vitest';
import { groupBooks, groupByLocation } from './groupBooks';

type Copy = {
  id: number;
  title: string;
  authors: string;
  location: string;
  status: 'available' | 'borrowed';
  is_restricted: 0 | 1;
};

// 棚にある（借りられる）本・持ち出し禁止の本（棚にある）・貸出中の本
const shelf = (id: number): Copy => ({
  id,
  title: '本',
  authors: '著者',
  location: '虎ノ門 20F',
  status: 'available',
  is_restricted: 0,
});
const restricted = (id: number): Copy => ({ ...shelf(id), is_restricted: 1 });
const lent = (id: number): Copy => ({ ...shelf(id), status: 'borrowed' });

describe('groupByLocation（代表の選び方）', () => {
  it('BP-01: 持ち出し禁止の本が先でも、棚にある（借りられる）本が代表', () => {
    expect(groupByLocation([restricted(1), shelf(2)])[0].representative.id).toBe(2);
  });

  it('BP-02: 貸出中・持ち出し禁止・棚にある本が混ざるときは、棚にある（借りられる）本が代表', () => {
    expect(groupByLocation([lent(1), restricted(2), shelf(3)])[0].representative.id).toBe(3);
  });

  it('BP-03: 貸出中の本と持ち出し禁止の本だけのときは、持ち出し禁止の本が代表', () => {
    expect(groupByLocation([lent(1), restricted(2)])[0].representative.id).toBe(2);
  });

  it('BP-04: 全て持ち出し禁止のときは、最初の1冊が代表', () => {
    expect(groupByLocation([restricted(1), restricted(2)])[0].representative.id).toBe(1);
  });

  it('BP-05: 棚にある本が何冊もあるときは、そのうち最初の1冊が代表', () => {
    expect(groupByLocation([restricted(1), shelf(2), shelf(3)])[0].representative.id).toBe(2);
  });

  it('BP-06: 持ち出し禁止の本も、棚にある冊数に数える', () => {
    expect(groupByLocation([restricted(1), shelf(2)])[0].availableCount).toBe(2);
  });
});

describe('groupBooks（代表の選び方）', () => {
  it('BP-07: 持ち出し禁止の本が先でも、棚にある（借りられる）本が代表', () => {
    expect(groupBooks([restricted(1), shelf(2)])[0].representative.id).toBe(2);
  });

  it('BP-08: 貸出中の本と持ち出し禁止の本だけのときは、持ち出し禁止の本が代表', () => {
    expect(groupBooks([lent(1), restricted(2)])[0].representative.id).toBe(2);
  });
});
