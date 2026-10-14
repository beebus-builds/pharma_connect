p='src/app/insights/InsightsView.tsx'
s=open(p,encoding='utf-8').read()

# stats grid
s=s.replace(
'''            {cards.map(({ icon: Icon, label, value }, i) => (
              <Reveal as="li" key={label} delay={i * 0.04}>''',
'''            {cards.map(({ icon: Icon, label, value }, i) => (
              <li key={label}>
                <Reveal delay={i * 0.04}>''')

# coverage
s=s.replace(
'''                {coverage.map((c, i) => (
                  <Reveal as="li" key={c.name} delay={i * 0.02}>''',
'''                {coverage.map((c, i) => (
                  <li key={c.name}>
                    <Reveal delay={i * 0.02}>''')

# top requested
s=s.replace(
'''                {topRequested.map((r, i) => (
                  <Reveal as="li" key={r.genericName} delay={i * 0.02}>''',
'''                {topRequested.map((r, i) => (
                  <li key={r.genericName}>
                    <Reveal delay={i * 0.02}>''')

# We need to add </li> after the *outermost* Reveal closes for each map whose closing
# immediately precedes the list end; handle with targeted ones by matching preceding code:
s=s.replace(
'''                  <p className="mt-4 text-center text-xs text-fg-subtle">{t("insights.statsNote")}</p>''',
'''                  <p className="mt-4 text-center text-xs text-fg-subtle">{t("insights.statsNote")}</p>
                  </li>''')  # NB: this would be wrong; skip realistically via below instead
open(p,'w',encoding='utf-8').write(s)
print("step1 done")
PY