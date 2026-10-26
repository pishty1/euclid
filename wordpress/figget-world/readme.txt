=== Figget World ===
Requires at least: 6.0
Requires PHP: 8.0
Stable tag: 0.1.0
License: EPL-2.0

A small persistent, action-based shared frontier for the Euclid app.

INSTALLATION
Upload figget-world.zip in WordPress Admin > Plugins > Add New > Upload Plugin,
then activate Figget World. The frontend lives separately at /apps/euclid/.
Uses existing WordPress accounts with the read capability (Subscribers work).
WordPress registration need not be public: an administrator can invite accounts.
The static app and WordPress must share an origin. Normal WP root installation
is expected. Exclude /wp-admin/admin-ajax.php?action=figget_session and
/wp-json/figget/v1/* (or equivalent ?rest_route= routes) from caching.

WORLD
One 48x48 persistent map, finite regenerating resources, hazardous ore mining,
food and recovery, death/respawn, public food depots, shared activity and last-known
player positions. All authenticated players can see names and locations.
Actions are authoritative PHP rules; browser positions, inventories and scores
are never accepted. Mutations serialize with InnoDB row locks. Requests carry a
REST nonce and unique action ID. A 0.5-second per-character action cooldown and
64-entry retry journal reject spam and recent duplicates. This is not a public
API rate limiter: use host-level limits if opening account registration widely.

World time advances from server timestamps on requests. No cron, websocket,
background worker, paid service or plugin dependency. Other players can supply
and use your public depots while you are offline. No offline raids or decay.
The UI polls every eight seconds while active. Online means active within 90s;
offline markers are explicitly last-known positions. Latest 200 events retained.

OPERATIONS
Data lives in the {prefix}figget_world InnoDB table. Include it in WordPress DB
backups. Deactivation/reactivation preserves the world. Uninstall also preserves
data; deliberate permanent removal requires an administrator to drop that table.
Prototype limits: 2,000 lifetime characters, eight depots per character, 30 carried
resources. Those are storage limits, not tested concurrent-user capacity. One
serialized state row is appropriate only for modest populations: monitor DB lock
wait, response times and hosting CPU; move to partitioned storage/dedicated game
service before scaling. This is not a real-time or massively scalable MMO.

The existing solo expedition stays separate in local browser storage. No local
saves are imported into the authoritative shared world.
