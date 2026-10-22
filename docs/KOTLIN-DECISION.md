# Do we need Kotlin? A plain answer

Written 22 October 2026, in response to the Kotlin Multiplatform proposal of the
same day. The full technical version is in `docs/LAUNCH-DECEMBER.md`.

---

## The short answer

**No. Not now.**

Kotlin would give us a better app eventually. But it cannot give us an app by
December, and we do not yet know that we need it at all.

Ship what we have. Ask again in April.

---

## Why we are even asking

The proposal says carpooling is a location product. Riders want to see where their
driver is. Our app has no GPS and no maps. That is true, and it matters.

The proposal says native code does location better than React Native. That is also
true, especially for tracking a driver while the phone is locked.

So the question looks like: *do we want good location, yes or no?*

But that is the wrong question.

---

## The question we should be asking

The real question is: **why does our app not have GPS today?**

The answer is not "because React Native can't do it." The answer is that nobody
installed the GPS library. It was never attempted. One week of work would tell us
whether React Native handles our location needs or not.

We have not spent that week. We are being asked to spend six months instead.

---

## Three things worth knowing before we decide

### 1. The app is broken in ways Kotlin does not fix

Our mobile app cannot take a payment. When you book a seat, it pretends to pay and
tells you it worked. No money moves. No booking is saved.

That is not React Native's fault. Somebody wrote the payment code and never connected
it. The connection is a few days of work.

The same is true of almost everything else on our problem list — our payment server
has a security hole, our database is in an unknown state, our settings live in a
dashboard instead of in the code. **Every one of those problems stays exactly the
same if we switch to Kotlin.** We would fix them anyway, and then rebuild the app on
top. We pay twice.

### 2. We would be comparing the wrong two things

The proposal compares a finished Kotlin app against the half-finished app we have
today. Of course the finished one looks better.

The fair comparison is a finished Kotlin app against a *finished* React Native app.
The difference between those two is: live tracking works more reliably when the phone
is locked. That is a real difference. It is not a six-month difference.

### 3. Building for iPhone needs a Mac — unless we use Expo

This is the one nobody mentioned, and it may decide everything.

We develop on Windows. Right now we can still build and ship an iPhone app, because
Expo builds it for us on their machines in the cloud.

Kotlin cannot do that. Building an iPhone app in Kotlin requires Apple's own software,
which only runs on a Mac. So switching to Kotlin means buying a Mac and learning
Apple's build tools, on top of everything else.

---

## What the proposal gets right, and we should act on today

The proposal found a genuine, serious problem in our payment system, and it is right
about it.

Four of our payment functions do not check who is asking. One of them is worse than
the proposal realised: **anyone can tell our server to release the money held for any
ride, and it will pay out.** Real money. To anyone who asks.

This has nothing to do with Kotlin. It is live right now. **It should be fixed this
week**, and it is about half a day of work.

Whoever wrote that proposal found something real. That part should be acted on
immediately, whatever we decide about the stack.

---

## What we should do instead

**Now until December:** finish the app we have. Connect the payment. Fix the security
hole. Get it into the stores.

**January:** spend one week adding GPS and maps to the existing app, using the normal
React Native libraries. One week. Not a rebuild.

That week answers the question honestly. Either it works well enough — and we have
saved six months — or it clearly does not, and we will know exactly why, with real
evidence instead of an opinion.

**April, with that evidence in hand:** decide about Kotlin properly.

---

## When Kotlin would be the right call

Not never. Here is what would have to be true:

- We have shipped, and we have had real users for three months.
- We have hit a specific wall we can describe — most likely, tracking a driver fails
  on cheap Android phones because the phone keeps killing the app to save battery.
- We have hired at least one more developer, so a rebuild does not stop all other
  work.
- We have accepted we may end up writing the iPhone app separately anyway, which
  takes away a lot of what Kotlin promised to save.

None of those are true today. All of them are cheap to find out by shipping.

---

## The one argument that does hold up

The proposal says Kotlin is what the team knows best. That is a real advantage and it
should not be dismissed. Code you are comfortable owning for years is worth a lot.

It just is not worth missing the launch for. And it will still be true in April.

---

## In one line

**Rewriting a product nobody has used yet is the most expensive way to find out we
built the wrong thing twice.** Ship it, learn from it, then decide.
