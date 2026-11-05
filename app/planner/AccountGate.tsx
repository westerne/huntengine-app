'use client';

import { ButtonLink, Card, Lockup } from '../ui';

// Shown instead of the beta gate once accounts are on: every HuntQuarters
// account is a paid membership, so signed-out visitors and non-members are
// sent to sign in or join.
export default function AccountGate({ signedIn }: { signedIn: boolean }) {
  return (
    <div
      className="hq"
      style={{
        position: 'fixed', inset: 0, zIndex: 70, overflowY: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <Card className="hq-fade-up" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div className="hq-stack" style={{ alignItems: 'center' }}>
          <Lockup size={28} tagline />
          <h1 className="hq-h2" style={{ marginTop: 8 }}>
            {signedIn ? 'Membership needed' : 'For members'}
          </h1>
          <p className="hq-body">
            {signedIn
              ? 'Your account doesn’t have an active membership yet.'
              : 'Hunt recommendations, draw odds and your season plan, for members.'}
          </p>
          <div className="hq-stack" style={{ gap: 10, width: '100%', marginTop: 8 }}>
            {signedIn ? (
              <ButtonLink href="/join" block>Become a member</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" block>Sign in</ButtonLink>
                <ButtonLink href="/login" variant="secondary" block>Create an account</ButtonLink>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
