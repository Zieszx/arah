# How the predictive analysis works

Written to be read aloud to a client. No mathematics beyond counting, and
every claim here is checkable against the code.

---

## The one-sentence version

> A student answers ten questions. We find the students in our data who
> answered most like them, and report what those students actually went on to
> study.

That is genuinely the whole idea. Everything below is the machinery that makes
it reliable.

---

## Where the knowledge comes from

**207 real Malaysian SPM leavers.** Each one answered the same ten questions
about themselves *and* told us two more things: which field they went on to
study, and how satisfied they were with it.

That pairing is the entire asset. The system does not know anything about
careers in general — it knows what these 207 specific people answered, and
where they ended up.

**This matters when you are asked "how does it know?"** It does not know. It
compares.

---

## The five steps

### 1. Encode — turn answers into numbers

A student's ten answers become a list of **55 numbers**.

Each answer option gets its own slot, set to 1 if the student picked it and 0
if they did not. "Took the Science stream" is one slot. "Enjoyed mathematics"
is another. The one question with a 1-to-5 scale — comfort with public
speaking — is scaled into the same range so it cannot dominate the others
simply by being a bigger number.

The same encoding was applied to all 207 alumni when the system was built. So
a student and an alumnus become directly comparable: 55 numbers against 55
numbers.

*This is what turns "students like you" from a figure of speech into a
measurement.*

### 2. Compare — find who answered similarly

With everyone represented the same way, "similar" becomes something you can
calculate rather than assert.

### 3. Vote — four methods, not one

Four different techniques each look at the data and produce a score for every
one of the ten fields. Their scores are averaged.

| Method | The question it asks |
| --- | --- |
| Nearest neighbours | Who answered most like this student, and what did *they* choose? |
| Logistic regression | Which individual answers have historically pointed towards which field? |
| Random forest | Which *combinations* matter — results **and** favourite subject **and** temperament together? |
| Naive Bayes | Steadies the vote where a field has few examples to learn from |

**Why four instead of one?** Any single method can be confidently wrong. Four
methods rarely make the same mistake in the same direction, so a bad answer
from one gets outvoted. It also means the result does not depend on which
technique someone happened to prefer.

### 4. Marginalise — handle "I don't know yet" honestly

Many students have not chosen a pre-university route yet. That is a normal
answer, not a missing one.

Rather than guessing a route for them, the system predicts **once for every
route** and averages the answers, weighted by how common each route is in the
data. The uncertainty is carried through the calculation instead of hidden
inside it.

The system also **says so on screen** when it has done this, and reports the
lower accuracy that goes with it.

### 5. Rank — order the fields, and show the evidence

Fields are listed by score. Each one carries the number of alumni it rests on,
so a match built on forty students looks visibly different from one built on
eleven.

---

## How accurate is it?

We measure whether the student's **actual** field appeared in their **top
three** suggestions — because that is how the result is presented. A single
answer would claim more certainty than 207 people can support.

| | |
| --- | --- |
| Student has chosen a pre-university route | **71.5%** |
| Student has not chosen one yet | **63.7%** |
| Guessing the three most popular fields every time | 49.3% |

**Both numbers appear on the website.** The weaker one is never hidden.

### What the numbers honestly mean

Measured by **repeated cross-validation**: the model is trained on part of the
data and tested on the part it has not seen, over and over with different
splits. That is the standard way to avoid a model that has simply memorised
its own answers.

At 207 people the margin of error is roughly **±6 points**, so a change of one
or two points is noise, not improvement. If someone quotes a figure to one
decimal place and treats a 1% difference as meaningful, they are over-reading
it.

*An early version of this project once reported 74.4%. It came from a single
lucky split of the data and was withdrawn. The figures above survive being
re-measured.*

---

## What it is, and what it is not

| It is | It is not |
| --- | --- |
| A comparison against real outcomes | A verdict on what anyone should do |
| A shortlist backed by evidence | A personality or aptitude test |
| A description of where similar students went | A prediction of success or salary |
| A starting point for a conversation | A replacement for a counsellor |

The website says **"students like you chose this."** It never says *"you
should study this."* That distinction is enforced in the wording throughout
the product, not merely intended.

---

## Questions a client is likely to ask

**"Is this AI?"**
It is machine learning: the system learned patterns from real data rather than
following rules someone wrote. There is no chatbot and no language model. It
cannot invent an answer, because it can only report combinations that exist in
the 207 records.

**"Can it be wrong?"**
Yes, and the site says so. Roughly three in ten students will not see their
eventual field in the top three. That is why it is presented as a shortlist to
think about, not an instruction.

**"Why only 207 people?"**
That is how many real, complete responses exist. More would narrow the margin
of error, and the system already includes the mechanism to collect them: an
alumnus can contribute their own outcome, an administrator approves it, and it
joins the training data at the next retraining.

**"Could you not just add data from the internet?"**
Not honestly. National statistics say how many people enrolled in each field
but nothing about what any individual answered, so they cannot teach the model
anything. Public "career prediction" datasets were examined and rejected —
most are computer-generated or come from fictional institutions. Adding
invented people would improve the numbers on paper while making them
meaningless. See [DATA-SOURCES.md](./DATA-SOURCES.md).

**"Does it get better over time?"**
Only when real people contribute real outcomes, and only when a person
retrains it and checks the score first. It never retrains itself — see
[RETRAINING.md](./RETRAINING.md) for why that is deliberate.

**"Is student data safe?"**
A student's answers are visible only to them and to an administrator, enforced
by the database itself rather than by the interface. Published statistics hide
any field with fewer than ten students, and show sample sizes as ranges so no
individual can be identified by comparing pages. See the site's own privacy
page.

---

## The short version for a slide

1. Ten questions become 55 numbers
2. Compared against 207 real Malaysian SPM leavers
3. Four methods vote; none decides alone
4. "Not sure yet" is averaged across routes, never guessed
5. Fields ranked, each showing the evidence behind it
6. **71.5% / 63.7%** top-three accuracy — both published, against a 49.3%
   baseline
