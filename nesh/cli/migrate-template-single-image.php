<?php



use Nesh\App;

use Nesh\Query;



global $argv;



$applyDb = in_array('--db', $argv, true);

$userId = (int) ($argv[2] ?? 0);

if ($userId <= 0) {

    echo 'Usage: php nesh migrate-template-single-image <user_id> [--db]' . PHP_EOL;

    echo '  --db  Also run SQL migration on dyscover_template_fields' . PHP_EOL;

    exit(1);

}



$app = App::get('dyscover');

if ($app === null) {

    echo 'Dyscover application is not configured.' . PHP_EOL;

    exit(1);

}



if ($applyDb) {

    migrateDatabase();

}



$roots = [

    $app->paths['assets'] . '/users/' . $userId . '/article',

    $app->paths['assets'] . '/users/' . $userId . '/articles',

];



$stats = [

    'files' => 0,

    'updated' => 0,

    'single' => 0,

    'large' => 0,

    'macros' => 0,

];



foreach ($roots as $dir) {

    if (!is_dir($dir)) {

        continue;

    }

    foreach (glob($dir . '/*.html') ?: [] as $file) {

        $stats['files']++;

        $original = (string) file_get_contents($file);

        [$updated, $fileStats] = migrateArticleHtml($original);

        if ($updated !== $original) {

            file_put_contents($file, $updated);

            $stats['updated']++;

        }

        $stats['single'] += $fileStats['single'];

        $stats['large'] += $fileStats['large'];

        $stats['macros'] += $fileStats['macros'];

    }

}



$fieldRows = migrateTemplateFieldTypes($userId);



echo 'Template image migration completed.' . PHP_EOL;

echo '  Article files scanned: ' . $stats['files'] . PHP_EOL;

echo '  Article files updated: ' . $stats['updated'] . PHP_EOL;

echo '  Single images (50%): ' . $stats['single'] . PHP_EOL;

echo '  Large images (100%): ' . $stats['large'] . PHP_EOL;

echo '  Source macros rewritten: ' . $stats['macros'] . PHP_EOL;

echo '  Template field rows updated: ' . $fieldRows . PHP_EOL;



function migrateTemplateFieldTypes(int $userId): int

{

    $updated = Query::execute(

        "UPDATE ielectro_dyscover.dyscover_template_fields tf

        INNER JOIN ielectro_dyscover.dyscover_posts p ON p.id = tf.template_id

        SET tf.type = 'single-image'

        WHERE p.user_id = ?

        AND tf.type = 'image'",

        [$userId]

    );



    $updated += Query::execute(

        "UPDATE ielectro_dyscover.dyscover_template_fields tf

        INNER JOIN ielectro_dyscover.dyscover_posts p ON p.id = tf.template_id

        SET tf.type = 'single-image'

        WHERE p.user_id = ?

        AND LOWER(tf.name) REGEXP '(^| )logo( |$)'",

        [$userId]

    );



    $updated += Query::execute(

        "UPDATE ielectro_dyscover.dyscover_template_fields tf

        INNER JOIN ielectro_dyscover.dyscover_posts p ON p.id = tf.template_id

        SET tf.type = 'large-image'

        WHERE p.user_id = ?

        AND LOWER(tf.name) REGEXP '(^| )map( |$)'",

        [$userId]

    );



    $updated += Query::execute(

        "UPDATE ielectro_dyscover.dyscover_template_fields tf

        INNER JOIN ielectro_dyscover.dyscover_posts p ON p.id = tf.template_id

        SET tf.type = 'single-image'

        WHERE p.user_id = ?

        AND tf.type = ''

        AND LOWER(tf.name) REGEXP '(^| )(flag|emblem|image|coat|seal|symbol)( |$)'",

        [$userId]

    );



    $updated += Query::execute(

        "UPDATE ielectro_dyscover.dyscover_template_fields tf

        INNER JOIN ielectro_dyscover.dyscover_posts p ON p.id = tf.template_id

        SET tf.type = 'single-image'

        WHERE p.user_id = ?

        AND tf.type = 'double-image'

        AND LOWER(tf.name) REGEXP '(^| )logo( |$)'",

        [$userId]

    );



    $updated += Query::execute(

        "UPDATE ielectro_dyscover.dyscover_template_fields tf

        INNER JOIN ielectro_dyscover.dyscover_posts p ON p.id = tf.template_id

        SET tf.type = 'large-image'

        WHERE p.user_id = ?

        AND tf.type = 'double-image'

        AND LOWER(tf.name) REGEXP '(^| )map( |$)'",

        [$userId]

    );



    return $updated;

}



function migrateDatabase(): void

{

    $sqlPath = dirname(__DIR__, 2) . '/dyscover/database/7-template-single-image.sql';

    if (!is_file($sqlPath)) {

        echo 'SQL file not found: ' . $sqlPath . PHP_EOL;

        exit(1);

    }



    $sql = (string) file_get_contents($sqlPath);

    foreach (splitSqlStatements($sql) as $statement) {

        Query::execute($statement);

    }



    echo 'Database schema migration applied.' . PHP_EOL;

}



/** @return list<string> */

function splitSqlStatements(string $sql): array
{
    $lines = preg_split('/\R/', $sql) ?: [];
    $lines = array_map(
        static fn(string $line): string => preg_match('/^\s*--/', $line) ? '' : $line,
        $lines
    );
    $parts = array_filter(array_map('trim', explode(';', implode("\n", $lines))));
    return array_values(array_filter(
        $parts,
        static fn(string $part): bool => $part !== ''
    ));
}



/** @return array{0: string, 1: array{single: int, large: int, macros: int}} */

function migrateArticleHtml(string $html): array

{

    $stats = ['single' => 0, 'large' => 0, 'macros' => 0];



    $html = preg_replace_callback(

        '/\{\{template-image\|([^}]+)\}\}/i',

        static function (array $matches) use (&$stats): string {

            $stats['macros']++;

            return '{{template-single-image|' . $matches[1] . '}}';

        },

        $html

    ) ?? $html;



    $html = preg_replace_callback(

        '/\{\{(?:large-image)\|([^}]+)\}\}/i',

        static function (array $matches) use (&$stats): string {

            $stats['macros']++;

            return '{{template-large-image|' . $matches[1] . '}}';

        },

        $html

    ) ?? $html;



    $html = preg_replace_callback(
        '/(<tr\b[^>]*\bdata-field="logo"[^>]*>[\s\S]*?<img\b)([^>]*>)/i',
        static function (array $matches) use (&$stats): string {
            $attrs = $matches[2];
            if (!preg_match('/\bclass="([^"]*)"/i', $attrs, $classMatch)) {
                return $matches[0];
            }
            $classes = preg_split('/\s+/', trim($classMatch[1])) ?: [];
            $classes = array_values(array_diff($classes, [
                'template-image',
                'template-large-image',
                'template-single-image',
            ]));
            $classes[] = 'template-single-image';
            $attrs = preg_replace(
                '/\bclass="[^"]*"/i',
                'class="' . trim(implode(' ', array_unique($classes))) . '"',
                $attrs,
                1
            ) ?? $attrs;
            $attrs = stripWidthStyle($attrs);
            $stats['single']++;
            return $matches[1] . $attrs;
        },
        $html
    ) ?? $html;

    $html = preg_replace_callback(
        '/(<tr\b[^>]*\bdata-field="map"[^>]*>[\s\S]*?<img\b)([^>]*>)/i',
        static function (array $matches) use (&$stats): string {
            $attrs = $matches[2];
            if (!preg_match('/\bclass="([^"]*)"/i', $attrs, $classMatch)) {
                return $matches[0];
            }
            $classes = preg_split('/\s+/', trim($classMatch[1])) ?: [];
            $classes = array_values(array_diff($classes, [
                'template-image',
                'template-large-image',
                'template-single-image',
            ]));
            $classes[] = 'template-large-image';
            $attrs = preg_replace(
                '/\bclass="[^"]*"/i',
                'class="' . trim(implode(' ', array_unique($classes))) . '"',
                $attrs,
                1
            ) ?? $attrs;
            $attrs = stripWidthStyle($attrs);
            $stats['large']++;
            return $matches[1] . $attrs;
        },
        $html
    ) ?? $html;



    $html = preg_replace_callback(

        '/<img\b([^>]*?)>/i',

        static function (array $matches) use (&$stats): string {

            $attrs = $matches[1];

            if (!preg_match('/\bclass="([^"]*)"/i', $attrs, $classMatch)) {

                return $matches[0];

            }



            $classes = preg_split('/\s+/', trim($classMatch[1])) ?: [];

            $isDouble = in_array('template-first-image', $classes, true)

                || in_array('template-second-image', $classes, true);

            if ($isDouble) {

                $classes = array_values(array_diff($classes, [

                    'template-image',

                    'template-large-image',

                    'template-single-image',

                ]));

                $attrs = preg_replace(

                    '/\bclass="[^"]*"/i',

                    'class="' . trim(implode(' ', $classes)) . '"',

                    $attrs,

                    1

                ) ?? $attrs;

                $attrs = stripWidthStyle($attrs);

                return '<img' . $attrs . '>';

            }



            $wasLarge = in_array('template-large-image', $classes, true);

            $wasSingle = in_array('template-single-image', $classes, true)

                || in_array('template-image', $classes, true);

            if (!$wasLarge && !$wasSingle) {

                return $matches[0];

            }



            $forceLarge = $wasLarge;

            if (!$forceLarge && preg_match('/\bstyle="[^"]*\bwidth\s*:\s*100%/i', $attrs)) {

                $forceLarge = true;

            }



            $classes = array_values(array_diff($classes, [

                'template-image',

                'template-large-image',

                'template-single-image',

            ]));

            if ($forceLarge) {

                $classes[] = 'template-large-image';

                $stats['large']++;

            } else {

                $classes[] = 'template-single-image';

                $stats['single']++;

            }



            $attrs = preg_replace(

                '/\bclass="[^"]*"/i',

                'class="' . trim(implode(' ', array_unique($classes))) . '"',

                $attrs,

                1

            ) ?? $attrs;

            $attrs = stripWidthStyle($attrs);



            return '<img' . $attrs . '>';

        },

        $html

    ) ?? $html;



    $html = preg_replace('/\sstyle="\s*"/i', '', $html) ?? $html;



    return [$html, $stats];

}



function stripWidthStyle(string $attrs): string

{

    if (!preg_match('/\bstyle="([^"]*)"/i', $attrs, $styleMatch)) {

        return $attrs;

    }



    $style = $styleMatch[1];

    $parts = array_filter(array_map('trim', explode(';', $style)), static function (string $rule): bool {

        return $rule !== '' && !preg_match('/^\s*width\s*:/i', $rule);

    });

    $attrs = preg_replace('/\sstyle="[^"]*"/i', '', $attrs, 1) ?? $attrs;

    if ($parts) {

        $attrs .= ' style="' . implode('; ', $parts) . ';"';

    }



    return $attrs;

}


