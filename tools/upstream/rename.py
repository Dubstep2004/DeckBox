import sys,re
s=open(sys.argv[1],encoding='utf-8',errors='surrogateescape').read()
for a,b in [('agent/PhoneBox.Agent.Tests/','agent/DeckBox.Agent.Tests/'),('agent/PhoneBox.Agent/','agent/DeckBox.Agent/'),
            ('java/net/oxog/phonebox/deskpanel/','java/io/github/dubstep2004/deckbox/'),('PhoneBox.Agent.Tests','DeckBox.Agent.Tests'),('PhoneBox.Agent','DeckBox.Agent'),
            ('namespace PhoneBox','namespace DeckBox'),('using PhoneBox','using DeckBox'),('package net.oxog.phonebox.deskpanel','package io.github.dubstep2004.deckbox'),
            ('net.oxog.phonebox.deskpanel','io.github.dubstep2004.deckbox')]:
    s=s.replace(a,b)
open(sys.argv[2],'w',encoding='utf-8',errors='surrogateescape').write(s)
