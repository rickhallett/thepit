// Arena page — preset selection grid.
// Server component that loads presets and displays them as cards.
// Users pick a preset, which navigates to /bout/{nanoid} with query params.
// Shows subscription/credit UI when SUBSCRIPTIONS_ENABLED and user is authenticated.

import { auth } from "@clerk/nextjs/server";
import { getAllPresets } from "@/lib/bouts/presets";
import { PresetCard } from "@/components/arena/preset-card";
import { getEnv } from "@/lib/common/env";
import { subscribeAction, buyCreditPackAction } from "./actions";

export default async function ArenaPage() {
  const presets = getAllPresets();
  const { userId } = await auth();
  const env = getEnv();
  const showSubscriptions = env.SUBSCRIPTIONS_ENABLED && userId;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">The Arena</h1>
      <p className="mb-6 text-stone-400">
        Pick a debate format to start a new bout.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {presets.map((preset) => (
          <PresetCard key={preset.id} preset={preset} />
        ))}
      </div>

      {showSubscriptions && (
        <>
          {/* Subscription tiers */}
          <section className="mt-12 border-t border-stone-800 pt-8">
            <h2 className="mb-4 text-2xl font-bold">Upgrade</h2>
            <p className="mb-6 text-stone-400">
              Get more bouts, faster rate limits, and monthly credits.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Pass tier */}
              <div className="rounded border border-stone-700 bg-stone-900 p-6">
                <h3 className="mb-2 text-lg font-bold">Pass</h3>
                <p className="mb-1 text-2xl font-bold">£3/mo</p>
                <ul className="mb-4 space-y-1 text-sm text-stone-400">
                  <li>15 bouts/hour</li>
                  <li>300 credits on signup + monthly</li>
                  <li>Up to 5 custom agents</li>
                  <li>BYOK support</li>
                </ul>
                <form action={subscribeAction}>
                  <input type="hidden" name="tier" value="pass" />
                  <button
                    type="submit"
                    className="w-full rounded bg-stone-100 px-4 py-2 font-medium text-stone-900 hover:bg-stone-200"
                  >
                    Subscribe
                  </button>
                </form>
              </div>

              {/* Lab tier */}
              <div className="rounded border border-amber-600 bg-stone-900 p-6">
                <h3 className="mb-2 text-lg font-bold">Lab</h3>
                <p className="mb-1 text-2xl font-bold">£10/mo</p>
                <ul className="mb-4 space-y-1 text-sm text-stone-400">
                  <li>Unlimited bouts</li>
                  <li>600 credits on signup + monthly</li>
                  <li>Unlimited custom agents</li>
                  <li>API access</li>
                </ul>
                <form action={subscribeAction}>
                  <input type="hidden" name="tier" value="lab" />
                  <button
                    type="submit"
                    className="w-full rounded bg-amber-600 px-4 py-2 font-medium text-stone-100 hover:bg-amber-500"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* Credit packs */}
          <section className="mt-8 border-t border-stone-800 pt-8">
            <h2 className="mb-4 text-2xl font-bold">Credit Packs</h2>
            <p className="mb-6 text-stone-400">
              Top up your credit balance for more bouts.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Small pack */}
              <div className="rounded border border-stone-700 bg-stone-900 p-6">
                <h3 className="mb-2 text-lg font-bold">100 Credits</h3>
                <p className="mb-4 text-2xl font-bold">£1</p>
                <form action={buyCreditPackAction}>
                  <input type="hidden" name="pack" value="small" />
                  <button
                    type="submit"
                    className="w-full rounded border border-stone-600 px-4 py-2 font-medium text-stone-100 hover:bg-stone-800"
                  >
                    Buy
                  </button>
                </form>
              </div>

              {/* Medium pack */}
              <div className="rounded border border-stone-700 bg-stone-900 p-6">
                <h3 className="mb-2 text-lg font-bold">500 Credits</h3>
                <p className="mb-4 text-2xl font-bold">£5</p>
                <form action={buyCreditPackAction}>
                  <input type="hidden" name="pack" value="medium" />
                  <button
                    type="submit"
                    className="w-full rounded border border-stone-600 px-4 py-2 font-medium text-stone-100 hover:bg-stone-800"
                  >
                    Buy
                  </button>
                </form>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
