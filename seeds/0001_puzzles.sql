-- このファイルは `bun run db:generate-seed` で src/puzzles/catalog.ts から生成しています。直接編集しないでください。
INSERT INTO puzzles (id, title, difficulty, sort_order, hint, definition) VALUES
  ('first-steps', 'まっすぐ進もう', 1, 1, '前進を並べて、星まで進みましょう。', '{"board":["bbbbB"],"start":{"x":0,"y":0,"direction":"right"},"functions":[5],"paints":[]}'),
  ('corners', '曲がり角', 1, 2, '右回転・左回転はその場で向きだけを変えます。', '{"board":["bbb.","..b.","..bB"],"start":{"x":0,"y":0,"direction":"right"},"functions":[8],"paints":[]}'),
  ('repeat', 'くりかえし', 1, 3, 'F1 の中で F1 を呼ぶと、同じ命令を何度でもくり返せます。', '{"board":["bBbBbBbBbBbB"],"start":{"x":0,"y":0,"direction":"right"},"functions":[2],"paints":[]}'),
  ('staircase', '階段', 2, 4, '1 段分の動きを書いてから、くり返しましょう。', '{"board":["b.....","bB....",".bB...","..bB..","...bB.","....bB"],"start":{"x":0,"y":0,"direction":"down"},"functions":[5],"paints":[]}'),
  ('red-corners', '赤い角で曲がれ', 2, 5, '命令に色を付けると、その色の床にいるときだけ実行されます。', '{"board":["bbBbr","....b","rbB.B","b...b","rbBbr"],"start":{"x":0,"y":0,"direction":"right"},"functions":[3],"paints":[]}'),
  ('red-and-green', '赤は右、緑は左', 2, 6, '条件付きの命令は 1 つの関数にいくつでも並べられます。', '{"board":["..rbr..","..B.B..","bbg.gbB"],"start":{"x":0,"y":2,"direction":"right"},"functions":[4],"paints":[]}'),
  ('comb', '関数で分ける', 2, 7, '何度も出てくる動きは F2 にまとめて、F1 から呼びましょう。', '{"board":[".B.B.B.",".b.b.b.","bbbbbbb"],"start":{"x":0,"y":2,"direction":"right"},"functions":[6,6],"paints":[]}'),
  ('crossroads', '十字路', 3, 8, '行き止まりで引き返す動きと、交差点で曲がる動きを分けて考えましょう。', '{"board":["...R...","...b...","...b...","RbbgbbR","...b...","...b...","...R..."],"start":{"x":3,"y":3,"direction":"up"},"functions":[4,2],"paints":[]}'),
  ('snake', 'ヘビのように', 3, 9, '右端と左端で、折り返し方が左右反対になります。', '{"board":["bbBbg","rbbBg","rBbbg","Bbbbg"],"start":{"x":0,"y":0,"direction":"right"},"functions":[4,3,3],"paints":[]}'),
  ('square-wave', '方形波', 3, 10, '道の形を 2 種類の部品に分けると、少ない命令で書けます。', '{"board":["bbb.Bbb.B","..b.b.b.b","..Bbb.Bbb"],"start":{"x":0,"y":0,"direction":"right"},"functions":[5,3,3],"paints":[]}'),
  ('leave-a-mark', '目印を残せ', 3, 11, 'ペンキで足元の色を変えておくと、戻ってきたときの目印になります。', '{"board":[".R.",".b.",".b.",".b.",".b.",".b.",".bB",".b.",".b.",".b."],"start":{"x":1,"y":6,"direction":"up"},"functions":[2,5],"paints":["green"]}'),
  ('second-time', '一度目と二度目', 4, 12, '同じマスを 2 回通ります。1 回目に通ったときに色を変えておきましょう。', '{"board":["rbbbgbB","b...b..","B...b..","b...b..","rbBbr.."],"start":{"x":0,"y":0,"direction":"right"},"functions":[4,2],"paints":["red","green","blue"]}'),
  ('way-back', '来た道を戻れ', 4, 13, '関数の途中で呼んだ関数が終わると、呼び出し元の残りの命令が実行されます。', '{"board":["....B.....","bbbbbbbbbR"],"start":{"x":4,"y":1,"direction":"right"},"functions":[3,2,4],"paints":[]}'),
  ('copy-distance', '距離をコピー', 5, 14, '横に進んだのと同じ数だけ下に進めば、星の真横に着きます。', '{"board":["bbbbbg.",".....b.",".....b.",".....b.",".....b.",".....bB",".....b.",".....b.",".....b.",".....b."],"start":{"x":0,"y":0,"direction":"right"},"functions":[3,4],"paints":[]}')
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  difficulty = excluded.difficulty,
  sort_order = excluded.sort_order,
  hint = excluded.hint,
  definition = excluded.definition,
  updated_at = CURRENT_TIMESTAMP;
