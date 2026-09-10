#!/usr/bin/env bash
# Kill already-running benchmark API servers. `ss` is absent in this image and
# `pkill -f` would match the caller's own command line, so match on argv[0].
for d in /proc/[0-9]*; do
   pid="${d#/proc/}"
   [ "$pid" = "$$" ] && continue
   [ -r "$d/cmdline" ] || continue
   argv0="$(tr '\0' '\n' < "$d/cmdline" 2>/dev/null | head -1)"
   case "$(basename "${argv0:-}")" in
      postgrest|node|bun|taskset) ;;
      *) continue ;;
   esac
   full="$(tr '\0' ' ' < "$d/cmdline" 2>/dev/null)"
   case "$full" in
      *postgrest/postgrest*|*@supabase/lite/dist/cli/index.js*start*)
         kill -9 "$pid" 2>/dev/null && echo "killed pid $pid: $full" ;;
   esac
done
