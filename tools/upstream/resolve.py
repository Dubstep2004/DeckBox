# resolve.py FILE ours|theirs  — keep one side of every conflict block
import sys,re
p,side=sys.argv[1],sys.argv[2]
s=open(p,encoding='utf-8').read()
pat=re.compile(r'^<<<<<<< [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n',re.S|re.M)
s,n=pat.subn(lambda m: m.group(1) if side=='ours' else m.group(2), s)
open(p,'w',encoding='utf-8').write(s); print(p,side,n)
