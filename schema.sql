-- ═══════════════════════════════════════════════════════════
-- STI ASSETS MANAGEMENT — SUPABASE SCHEMA
-- Run this entire file in Supabase > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ─────────────────────────────────────────────────────────
-- 1. PROFILES
-- One row per user. Linked to Supabase Auth (auth.users).
-- Stores investor info, role, and relationship manager.
-- ─────────────────────────────────────────────────────────
create table public.profiles (
    id                uuid primary key references auth.users(id) on delete cascade,
    investor_id       text unique,               -- e.g. "03312"
    first_name        text not null,
    last_name         text not null,
    email             text not null,
    phone             text,
    address           text,
    state             text,
    date_of_birth     date,
    bvn               text,
    role              text not null default 'investor'
                          check (role in ('investor','manager','admin')),
    kyc_status        text not null default 'pending'
                          check (kyc_status in ('pending','verified','rejected')),
    relationship_manager text,
    avatar_initials   text,
    created_at        timestamptz default now(),
    updated_at        timestamptz default now()
);

-- Auto-generate investor_id on insert
create sequence if not exists investor_id_seq start 3001;

create or replace function generate_investor_id()
returns trigger language plpgsql as $$
begin
    if new.investor_id is null then
        new.investor_id := lpad(nextval('investor_id_seq')::text, 5, '0');
    end if;
    new.avatar_initials := upper(left(new.first_name,1) || left(new.last_name,1));
    return new;
end;
$$;

create trigger trg_investor_id
before insert on public.profiles
for each row execute function generate_investor_id();

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated
before update on public.profiles
for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 2. INVESTMENTS
-- Each row is one investment product for one investor.
-- ─────────────────────────────────────────────────────────
create table public.investments (
    id              uuid primary key default uuid_generate_v4(),
    investor_id     uuid not null references public.profiles(id) on delete cascade,
    reference       text unique not null,        -- e.g. "REF-2024-001"
    type            text not null
                        check (type in ('Fixed Income','Money Market','Treasury Bills')),
    principal       numeric(15,2) not null,
    interest_rate   numeric(5,2) not null,       -- % per annum
    tenure_months   int not null,
    start_date      date not null,
    maturity_date   date not null,
    status          text not null default 'active'
                        check (status in ('active','matured','liquidated','pending')),
    notes           text,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

create trigger trg_investments_updated
before update on public.investments
for each row execute function set_updated_at();

-- Auto-generate reference number
create sequence if not exists investment_ref_seq start 1;

create or replace function generate_investment_ref()
returns trigger language plpgsql as $$
begin
    if new.reference is null then
        new.reference := 'REF-' || to_char(now(), 'YYYY') || '-' ||
                         lpad(nextval('investment_ref_seq')::text, 3, '0');
    end if;
    return new;
end;
$$;

create trigger trg_investment_ref
before insert on public.investments
for each row execute function generate_investment_ref();


-- ─────────────────────────────────────────────────────────
-- 3. LIQUIDATION REQUESTS
-- ─────────────────────────────────────────────────────────
create table public.liquidation_requests (
    id              uuid primary key default uuid_generate_v4(),
    investment_id   uuid not null references public.investments(id) on delete cascade,
    investor_id     uuid not null references public.profiles(id) on delete cascade,
    reason          text not null,
    investor_notes  text,
    status          text not null default 'pending'
                        check (status in ('pending','approved','rejected')),
    admin_note      text,
    penalty_amount  numeric(15,2),
    net_payout      numeric(15,2),
    reviewed_by     uuid references public.profiles(id),
    reviewed_at     timestamptz,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

create trigger trg_liquidations_updated
before update on public.liquidation_requests
for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 4. SUPPORT TICKETS
-- ─────────────────────────────────────────────────────────
create table public.support_tickets (
    id              uuid primary key default uuid_generate_v4(),
    investor_id     uuid not null references public.profiles(id) on delete cascade,
    ticket_number   text unique,                 -- e.g. "TKT-0042"
    subject         text not null,
    message         text not null,
    priority        text not null default 'normal'
                        check (priority in ('normal','urgent')),
    status          text not null default 'open'
                        check (status in ('open','in_progress','resolved')),
    assigned_to     uuid references public.profiles(id),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

create trigger trg_tickets_updated
before update on public.support_tickets
for each row execute function set_updated_at();

-- Auto-generate ticket number
create sequence if not exists ticket_seq start 1;

create or replace function generate_ticket_number()
returns trigger language plpgsql as $$
begin
    if new.ticket_number is null then
        new.ticket_number := 'TKT-' || lpad(nextval('ticket_seq')::text, 4, '0');
    end if;
    return new;
end;
$$;

create trigger trg_ticket_number
before insert on public.support_tickets
for each row execute function generate_ticket_number();


-- ─────────────────────────────────────────────────────────
-- 5. TICKET REPLIES
-- ─────────────────────────────────────────────────────────
create table public.ticket_replies (
    id          uuid primary key default uuid_generate_v4(),
    ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
    sender_id   uuid not null references public.profiles(id) on delete cascade,
    message     text not null,
    is_admin    boolean not null default false,
    created_at  timestamptz default now()
);


-- ─────────────────────────────────────────────────────────
-- 6. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────
create table public.notifications (
    id          uuid primary key default uuid_generate_v4(),
    investor_id uuid not null references public.profiles(id) on delete cascade,
    type        text not null
                    check (type in ('interest','maturity','alert','statement','payment','system')),
    title       text not null,
    message     text not null,
    action_url  text,
    action_label text,
    read_at     timestamptz,
    created_at  timestamptz default now()
);


-- ─────────────────────────────────────────────────────────
-- 7. NOTIFICATION PREFERENCES
-- ─────────────────────────────────────────────────────────
create table public.notification_preferences (
    id                      uuid primary key default uuid_generate_v4(),
    investor_id             uuid unique not null references public.profiles(id) on delete cascade,
    interest_credited       boolean default true,
    maturity_reminders      boolean default true,
    liquidation_updates     boolean default true,
    statement_ready         boolean default true,
    topup_confirmations     boolean default true,
    security_alerts         boolean default true,
    macro_updates           boolean default false,
    updated_at              timestamptz default now()
);

create trigger trg_notif_prefs_updated
before update on public.notification_preferences
for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 8. STATEMENTS
-- ─────────────────────────────────────────────────────────
create table public.statements (
    id              uuid primary key default uuid_generate_v4(),
    investor_id     uuid not null references public.profiles(id) on delete cascade,
    investment_id   uuid references public.investments(id) on delete set null,
    type            text not null
                        check (type in ('mid','maturity','annual')),
    period_label    text,                        -- e.g. "July–December 2024"
    generated_by    uuid references public.profiles(id),
    sent_to_email   text,
    created_at      timestamptz default now()
);


-- ─────────────────────────────────────────────────────────
-- 9. MACRO INDICATORS
-- One row per indicator, updated by admin.
-- ─────────────────────────────────────────────────────────
create table public.macro_indicators (
    id              uuid primary key default uuid_generate_v4(),
    indicator_key   text unique not null,        -- e.g. "mpr", "inflation"
    section         text not null
                        check (section in ('monetary','inflation_fx','growth','fiscal')),
    icon            text,
    title           text not null,
    value           text not null,
    change_label    text,
    direction       text not null default 'neu'
                        check (direction in ('pos','neg','neu')),
    description     text,
    update_period   text,
    sort_order      int default 0,
    updated_by      uuid references public.profiles(id),
    updated_at      timestamptz default now()
);

create trigger trg_macro_updated
before update on public.macro_indicators
for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 10. MACRO IMPLICATIONS
-- The "What This Means for Your Portfolio" cards
-- ─────────────────────────────────────────────────────────
create table public.macro_implications (
    id          uuid primary key default uuid_generate_v4(),
    sort_order  int unique not null,
    headline    text not null,
    body        text not null,
    updated_at  timestamptz default now()
);

create trigger trg_implications_updated
before update on public.macro_implications
for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 11. MACRO META (last updated label)
-- ─────────────────────────────────────────────────────────
create table public.macro_meta (
    id            int primary key default 1,     -- always one row
    last_updated  text not null default 'Jan 2025',
    updated_at    timestamptz default now(),
    check (id = 1)                               -- enforce single row
);

insert into public.macro_meta (last_updated) values ('Jan 2025')
on conflict (id) do nothing;


-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.profiles                  enable row level security;
alter table public.investments               enable row level security;
alter table public.liquidation_requests      enable row level security;
alter table public.support_tickets           enable row level security;
alter table public.ticket_replies            enable row level security;
alter table public.notifications             enable row level security;
alter table public.notification_preferences  enable row level security;
alter table public.statements                enable row level security;
alter table public.macro_indicators          enable row level security;
alter table public.macro_implications        enable row level security;
alter table public.macro_meta                enable row level security;


-- ─────────────────────────────────────────────────────────
-- PROFILES policies
-- ─────────────────────────────────────────────────────────
create policy "Investors can read own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Investors can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Admins can read all profiles"
    on public.profiles for select
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can update all profiles"
    on public.profiles for update
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can insert profiles"
    on public.profiles for insert
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );


-- ─────────────────────────────────────────────────────────
-- INVESTMENTS policies
-- ─────────────────────────────────────────────────────────
create policy "Investors can read own investments"
    on public.investments for select
    using (investor_id = auth.uid());

create policy "Admins can read all investments"
    on public.investments for select
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can insert investments"
    on public.investments for insert
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can update investments"
    on public.investments for update
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );


-- ─────────────────────────────────────────────────────────
-- LIQUIDATION REQUESTS policies
-- ─────────────────────────────────────────────────────────
create policy "Investors can read own liquidation requests"
    on public.liquidation_requests for select
    using (investor_id = auth.uid());

create policy "Investors can insert own liquidation requests"
    on public.liquidation_requests for insert
    with check (investor_id = auth.uid());

create policy "Admins can read all liquidation requests"
    on public.liquidation_requests for select
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can update liquidation requests"
    on public.liquidation_requests for update
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );


-- ─────────────────────────────────────────────────────────
-- SUPPORT TICKETS policies
-- ─────────────────────────────────────────────────────────
create policy "Investors can read own tickets"
    on public.support_tickets for select
    using (investor_id = auth.uid());

create policy "Investors can create tickets"
    on public.support_tickets for insert
    with check (investor_id = auth.uid());

create policy "Admins can read all tickets"
    on public.support_tickets for select
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can update tickets"
    on public.support_tickets for update
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );


-- ─────────────────────────────────────────────────────────
-- TICKET REPLIES policies
-- ─────────────────────────────────────────────────────────
create policy "Users can read replies on their tickets"
    on public.ticket_replies for select
    using (
        exists (
            select 1 from public.support_tickets t
            where t.id = ticket_id
            and t.investor_id = auth.uid()
        )
        or
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Users can insert replies"
    on public.ticket_replies for insert
    with check (sender_id = auth.uid());


-- ─────────────────────────────────────────────────────────
-- NOTIFICATIONS policies
-- ─────────────────────────────────────────────────────────
create policy "Investors can read own notifications"
    on public.notifications for select
    using (investor_id = auth.uid());

create policy "Investors can update own notifications"
    on public.notifications for update
    using (investor_id = auth.uid());

create policy "Admins can insert notifications"
    on public.notifications for insert
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can read all notifications"
    on public.notifications for select
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );


-- ─────────────────────────────────────────────────────────
-- NOTIFICATION PREFERENCES policies
-- ─────────────────────────────────────────────────────────
create policy "Investors can read own preferences"
    on public.notification_preferences for select
    using (investor_id = auth.uid());

create policy "Investors can upsert own preferences"
    on public.notification_preferences for insert
    with check (investor_id = auth.uid());

create policy "Investors can update own preferences"
    on public.notification_preferences for update
    using (investor_id = auth.uid());


-- ─────────────────────────────────────────────────────────
-- STATEMENTS policies
-- ─────────────────────────────────────────────────────────
create policy "Investors can read own statements"
    on public.statements for select
    using (investor_id = auth.uid());

create policy "Admins can read all statements"
    on public.statements for select
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can insert statements"
    on public.statements for insert
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );


-- ─────────────────────────────────────────────────────────
-- MACRO policies (public read, admin write)
-- ─────────────────────────────────────────────────────────
create policy "Anyone can read macro indicators"
    on public.macro_indicators for select
    using (true);

create policy "Admins can update macro indicators"
    on public.macro_indicators for update
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Admins can insert macro indicators"
    on public.macro_indicators for insert
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Anyone can read macro implications"
    on public.macro_implications for select
    using (true);

create policy "Admins can manage macro implications"
    on public.macro_implications for all
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );

create policy "Anyone can read macro meta"
    on public.macro_meta for select
    using (true);

create policy "Admins can update macro meta"
    on public.macro_meta for update
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role in ('admin','manager')
        )
    );


-- ═══════════════════════════════════════════════════════════
-- SEED: DEFAULT MACRO INDICATORS
-- Run this after the schema to populate starting data
-- ═══════════════════════════════════════════════════════════

insert into public.macro_indicators
    (indicator_key, section, icon, title, value, change_label, direction, description, update_period, sort_order)
values
    -- Monetary
    ('mpr',      'monetary',     '📈', 'CBN Monetary Policy Rate',  '27.50%',        '+50bps (Nov 2024)',   'neg', 'The CBN''s benchmark rate, influencing lending and deposit rates across the economy.',                                          'Nov 2024',       1),
    ('tbill',    'monetary',     '💳', 'Treasury Bills Rate (91-day)','22.10%',       '+180bps (Q4 2024)',   'pos', 'Short-term government borrowing rate; a benchmark for fixed income instruments.',                                               'Q4 2024',        2),
    ('bond',     'monetary',     '🏛️', 'FGN Bond Yield (10-yr)',    '19.80%',         '+240bps (YTD)',       'pos', 'Long-term sovereign debt yield, reflecting government borrowing costs and investor risk appetite.',                            'YTD 2024',       3),
    ('plr',      'monetary',     '💰', 'Prime Lending Rate',        '31.20%',         '+120bps (H2 2024)',   'neg', 'Average rate commercial banks charge their most creditworthy customers.',                                                      'H2 2024',        4),
    -- Inflation & FX
    ('inflation','inflation_fx', '🔥', 'Headline Inflation Rate',   '34.80%',         '+2.1pp (YoY)',        'neg', 'Nigeria''s CPI inflation remains elevated, driven by food prices and energy costs post-subsidy removal.',                     'YoY Dec 2024',   5),
    ('food_inf', 'inflation_fx', '🍞', 'Food Inflation',            '39.84%',         '+3.5pp (YoY)',        'neg', 'Food prices continue to surge, reflecting logistics costs, FX pass-through, and supply constraints.',                          'YoY Dec 2024',   6),
    ('usdngn',   'inflation_fx', '🌐', 'USD/NGN Official Rate',     '₦1,540',         '-32% (YTD)',          'neg', 'The naira has depreciated significantly since FX unification. Official and parallel rates remain close.',                      'YTD 2024',       7),
    ('parallel', 'inflation_fx', '🏪', 'Parallel Market Rate',      '₦1,570',         '+₦30 premium',        'neu', 'Street rate reflecting market demand; spread vs official rate remains relatively tight post-unification.',                    'Jan 2025',       8),
    -- Growth
    ('gdp',      'growth',       '🇳🇬', 'GDP Growth Rate',          '3.46%',          '+0.6pp (Q3 2024)',    'pos', 'Real GDP growth, driven by services sector. Oil sector underperformance continues to weigh on headline figures.',             'Q3 2024',        9),
    ('oil',      'growth',       '🛢️', 'Crude Oil Production',      '1.48M bpd',      '+120K bpd (MoM)',     'pos', 'Output remains below OPEC quota of 1.8M bpd. Pipeline security and investment drive gradual recovery.',                      'MoM Nov 2024',  10),
    ('pmi',      'growth',       '⚡', 'PMI (Manufacturing)',        '49.6',           '-0.8 (MoM)',          'neg', 'Below 50 signals contraction. Input cost pressures and FX constraints weigh on manufacturers.',                               'Dec 2024',      11),
    ('unemp',    'growth',       '💼', 'Unemployment Rate',         '33.3%',           'NBS Q4 2023',         'neg', 'Broad unemployment rate using NBS expanded definition. Youth unemployment significantly higher at ~53%.',                    'Q4 2023 (NBS)', 12),
    -- Fiscal
    ('reserves', 'fiscal',       '📋', 'External Reserves',         '$38.7B',          '+$1.2B (QoQ)',        'pos', 'CBN gross reserves provide approximately 7.5 months of import cover, above the 3-month adequacy threshold.',                 'QoQ Q4 2024',   13),
    ('deficit',  'fiscal',       '📉', 'Fiscal Deficit (% GDP)',    '-5.4%',           'Wider than target',   'neg', 'FGN budget deficit driven by debt servicing costs now consuming over 90% of retained revenue.',                              '2024 Budget',   14),
    ('debt_gdp', 'fiscal',       '🔄', 'Debt-to-GDP Ratio',        '42.3%',           '+4pp (2024)',          'neg', 'Total public debt rising due to new Eurobond issuances and domestic borrowing. Still within IMF thresholds.',                '2024',          15),
    ('trade',    'fiscal',       '🚢', 'Trade Balance',            '₦2.1T surplus',   'Improved (Q3 2024)',   'pos', 'Positive trade balance driven by oil export receipts outpacing import bills in naira terms.',                               'Q3 2024',       16)
on conflict (indicator_key) do nothing;


insert into public.macro_implications (sort_order, headline, body) values
    (1, 'High interest rates',  'Support strong fixed income returns. STI portfolios benefit from elevated T-Bill and money market yields.'),
    (2, 'Elevated inflation',   'Real returns remain positive as our portfolio rates exceed CPI — protecting purchasing power.'),
    (3, 'Naira depreciation',   'Naira-denominated investments remain the safest allocation for locally-based investors at current rate levels.'),
    (4, 'Stable reserves',      'Growing external reserves signal reduced risk of acute FX volatility over the medium term.')
on conflict (sort_order) do nothing;


-- ═══════════════════════════════════════════════════════════
-- HELPER FUNCTION: Create profile on signup
-- This runs automatically when a new user signs up
-- ═══════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into public.profiles (id, first_name, last_name, email, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'first_name', 'New'),
        coalesce(new.raw_user_meta_data->>'last_name',  'Investor'),
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'investor')
    );

    -- Create default notification preferences
    insert into public.notification_preferences (investor_id)
    values (new.id)
    on conflict (investor_id) do nothing;

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
