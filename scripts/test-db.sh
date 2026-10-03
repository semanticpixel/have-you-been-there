#!/usr/bin/env bash
# Applies the Supabase migrations to a throwaway local Postgres and runs the access-rule tests.
# Needs Postgres server binaries (initdb, pg_ctl) on PATH or in /usr/lib/postgresql/*/bin.
set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN=$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")
DIR=$(mktemp -d)
PORT=${PGPORT_TEST:-54329}
trap '"$PGBIN/pg_ctl" -D "$DIR" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

if [ "$(id -u)" = 0 ]; then RUN=(su postgres -c); chown -R postgres "$DIR"; else RUN=(bash -c); fi
"${RUN[@]}" "'$PGBIN/initdb' -D '$DIR' -A trust -U postgres >/dev/null"
"${RUN[@]}" "'$PGBIN/pg_ctl' -D '$DIR' -o '-p $PORT -k $DIR -c listen_addresses=' -w start >/dev/null"

PSQL=(psql -h "$DIR" -p "$PORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -o /dev/null -f supabase/tests/rls_test.sql 2>&1 | sed -n "s/.*NOTICE:  //p; /PASSED/p; /ERROR/p"
