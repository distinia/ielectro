<?php
namespace Dyscover;
use Nesh\Audio;
use Nesh\Query;
class Importer
{
    private string $root;
    private int $id = 2;
    private Mapper $mapper;
    private Post $post;
    private Tags $tags;
    private Article $article;
    private Media $media;
    private Template $template;
    public function __construct($dyscoverRoot)
    {
        $resolved = realpath($dyscoverRoot);
        $this->root = rtrim(str_replace('\\', '/', $resolved ?: $dyscoverRoot), '/');
        $this->post = new Post($this->id);
        $this->tags = new Tags();
        $this->mapper = new Mapper($this->root, $this->id);
        $this->article = new Article(
            $this->root,
            $this->id,
            $this->mapper,
            $this->post,
            $this->tags
        );
        $this->media = new Media(
            $this->root,
            $this->id,
            $this->mapper,
            $this->post,
            $this->tags
        );
        $this->template = new Template(
            $this->root,
            $this->id,
            $this->mapper,
            $this->post,
            $this->tags
        );
    }
    public function importEverything(): array
    {
        $this->mapper->prepareMediaMap();
        $this->mapper->prepareArticleMap();
        $templates = $this->template->import();
        $images = $this->media->importImages();
        $videos = $this->media->importVideos();
        $audio = $this->media->importAudio();
        $documents = $this->media->importDocuments();
        $articles = $this->article->import();
        $preview = new Preview($this->root, $this->id);
        $preview->import();
        $this->article->updateAllLinks();
        return [
            'articles' => $articles,
            'templates' => $templates,
            'images' => $images,
            'videos' => $videos,
            'audio' => $audio,
            'documents' => $documents
        ];
    }
    public function importArticles(): array
    {
        $this->mapper->prepareArticleMap();
        return $this->article->import();
    }
    public function importImages(): array
    {
        $this->mapper->prepareMediaMap();
        return $this->media->importImages();
    }
    public function importVideos(): array
    {
        $this->mapper->prepareMediaMap();
        return $this->media->importVideos();
    }
    public function importAudio(): array
    {
        $this->mapper->prepareMediaMap();
        return $this->media->importAudio();
    }
    public function importDocuments(): array
    {
        $this->mapper->prepareMediaMap();
        return $this->media->importDocuments();
    }
    public function importTemplates(): array
    {
        return $this->template->import();
    }
    public function renderReport(array $report): string
    {
        if (isset($report['articles'])) {
            $errors = [];
            $skipped = 0;
            foreach (['articles', 'images', 'videos', 'audio', 'documents', 'templates'] as $key) {
                $part = $report[$key] ?? ['errors' => [], 'skipped' => 0];
                $skipped += $part['skipped'] ?? 0;
                $errors = array_merge($errors, $part['errors'] ?? []);
            }
            $html = "<div class='log success'>Articles imported: ".($report['articles']['imported'] ?? 0)."</div>";
            $html .= "<div class='log success'>Images imported: ".($report['images']['imported'] ?? 0)."</div>";
            $html .= "<div class='log success'>Videos imported: ".($report['videos']['imported'] ?? 0)."</div>";
            $html .= "<div class='log success'>Audio imported: ".($report['audio']['imported'] ?? 0)."</div>";
            $html .= "<div class='log success'>Documents imported: ".($report['documents']['imported'] ?? 0)."</div>";
            $html .= "<div class='log success'>Templates imported: ".($report['templates']['imported'] ?? 0)."</div>";
            $html .= "<div class='log'>Skipped: {$skipped}</div>";
            $html .= "<div class='".(count($errors) ? 'log error' : 'log')."'>Errors: ".count($errors)."</div>";
            foreach ($errors as $error) {
                $html .= "<div class='log error'>".htmlspecialchars($error)."</div>";
            }
            return $html;
        }
        $errors = $report['errors'] ?? [];
        return "<div class='log success'>Imported: ".($report['imported'] ?? 0)."</div>
        <div class='log'>Skipped: ".($report['skipped'] ?? 0)."</div>
        <div class='".(count($errors) ? 'log error' : 'log')."'>Errors: ".count($errors)."</div>" .
            implode('', array_map(fn($error) => "<div class='log error'>".htmlspecialchars($error)."</div>", $errors));
    }
}
class Mapper
{
    private string $root;
    private int $id;
    private array $articleMap = [];
    private array $mediaMap = [];
    private array $templateMap = [];
    public function __construct($root, $id)
    {
        $this->root = $root;
        $this->id = $id;
    }
    public function prepareMediaMap() {
        foreach (['image', 'video', 'audio', 'document'] as $type) {
            $dir = $this->root.'/u/'.$this->id.'/'.$type;
            if (!is_dir($dir)) {
                continue;
            }
            foreach (new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
            ) as $file) {
                if (!$file->isFile()) {
                    continue;
                }
                $name = $file->getFilename();
                if ($name === '') {
                    continue;
                }
                $this->mediaMap[$name] = $name;
            }
        }
    }
    public function addMedia($old, $new) {
        $this->mediaMap[$old] = $new;
    }
    public function prepareArticleMap() {
        $dir = $this->root.'/u/'.$this->id.'/article';
        if (!is_dir($dir)) {
            return;
        }
        foreach (array_merge(
            glob($dir.'/*.html') ?: [],
            glob($dir.'/*.php') ?: []
        ) as $file) {
            $name = pathinfo($file, PATHINFO_FILENAME);
            $new = $this->uniqueFile('.html');
            $this->articleMap[$name] = pathinfo($new, PATHINFO_FILENAME);
        }
    }
    public function setTemplate($name, $file) {
        $this->templateMap[$name] = $file;
    }
    public function getArticleMap(): array
    {
        return $this->articleMap;
    }
    public function getMediaMap(): array
    {
        return $this->mediaMap;
    }
    public function getTemplateMap(): array
    {
        return $this->templateMap;
    }
    public function getArticle($name): ?string
    {
        return $this->articleMap[$name] ?? null;
    }
    public function getMedia($name): ?string
    {
        return $this->mediaMap[$name] ?? null;
    }
    public function getTemplate($name): ?string
    {
        return $this->templateMap[$name] ?? null;
    }
    private function uniqueFile($extension): string
    {
        do {
            $file = bin2hex(random_bytes(8)).$extension;
        } while (
            Query::fetch(
                'SELECT id FROM dyscover_posts WHERE file = ? LIMIT 1',
                [$file]
            )
        );
        return $file;
    }
}
class Post
{
    private int $id;
    public function __construct($id)
    {
        $this->id = $id;
    }
    public function exists($type, $file): bool
    {
        return Query::fetch(
            'SELECT id FROM dyscover_posts WHERE type = ? AND file = ? LIMIT 1',
            [$type, basename($file)]
        ) !== null;
    }
    public function createFile($extension): string
    {
        do {
            $file = bin2hex(random_bytes(8)).$extension;
        } while (
            Query::fetch(
                'SELECT id FROM dyscover_posts WHERE file = ? LIMIT 1',
                [$file]
            )
        );
        return $file;
    }
    public function insert(array $data): int
    {
        Query::execute(
            'INSERT INTO dyscover_posts(user_id,type,title,file,description) VALUES(?,?,?,?,?)',
            [
                $this->id,
                $data['type'],
                mb_substr($data['title'], 0, 255),
                $data['file'],
                $data['description'] ?? null
            ]
        );
        $id = Query::lastId();
        Query::execute(
            'INSERT INTO dyscover_post_analytics(post_id) VALUES(?)',
            [$id]
        );
        return $id;
    }
}
class Tags
{
    private const STOP_WORDS = [
        'of',
        'the',
        'a',
        'an',
        'and',
        'or',
        'for',
        'to',
        'in',
        'on',
        'at',
        'with',
        'from',
        'by',
        'is',
        'are',
        'was',
        'were',
        'be',
        'been',
        'being',
        'have',
        'has',
        'had',
        'do',
        'does',
        'did',
        'will',
        'would',
        'could',
        'should',
        'may',
        'might',
        'must',
        'shall',
        'can',
        'need',
        'that',
        'this',
        'these',
        'those',
        'it',
        'its',
        'as',
        'if',
        'but',
        'not',
        'no',
        'nor',
        'so',
        'than',
        'too',
        'very',
        'just',
        'about',
        'into',
        'through',
        'during',
        'before',
        'after',
        'above',
        'below',
        'between',
        'under',
        'again',
        'further',
        'then',
        'once',
        'here',
        'there',
        'when',
        'where',
        'why',
        'how',
        'all',
        'each',
        'few',
        'more',
        'most',
        'other',
        'some',
        'such',
        'only',
        'own',
        'same',
        'view',
        'personalize',
        'article',
        'share',
        'ideas',
        'information',
        'freely',
        'without',
        'censorship',
        'ielectro',
        'dyscover',
        'content',
        'html',
        'http',
        'https',
        'www',
        'com',
        'class',
        'section',
        'template',
        'start',
        'editing',
        'your'
    ];
    private const COUNTRY_TERMS = [
        'destenia',
        'agaritia',
        'alveria',
        'azaria',
        'boravia',
        'cavallesia',
        'comussania',
        'cusea',
        'fesia',
        'jarnovia',
        'kashiria',
        'lamberia',
        'laocitia',
        'metosia',
        'ricene',
        'somalia',
        'stasia',
        'suklan',
        'valmirica',
        'verdania',
        'rivoria',
        'edrobean',
        'tayanusan',
        'sifalam',
        'world union',
        'world_union'
    ];
    public function create($postId, array $tags) {
        foreach (array_unique($tags) as $tag) {
            $tag = strtolower(trim($tag));
            if ($tag === '') {
                continue;
            }
            $row = Query::fetch(
                'SELECT id FROM dyscover_tags WHERE name = ? LIMIT 1',
                [$tag]
            );
            if (!$row) {
                Query::execute(
                    'INSERT INTO dyscover_tags(name) VALUES(?)',
                    [$tag]
                );
                $row = [
                    'id' => Query::lastId()
                ];
            }
            Query::execute(
                'INSERT IGNORE INTO dyscover_post_tags(post_id,tag_id) VALUES(?,?)',
                [
                    $postId,
                    $row['id']
                ]
            );
        }
    }
    public function tokens($name): array
    {
        $normalized = $this->normalize(
            pathinfo($name, PATHINFO_FILENAME)
        );
        $tokens = [];
        foreach (preg_split('/\s+/', $normalized) ?: [] as $token) {
            $token = strtolower(trim($token));
            if (
                $token === '' ||
                strlen($token) < 2 ||
                in_array($token, self::STOP_WORDS, true)
            ) {
                continue;
            }
            $tokens[] = $token;
        }
        return $tokens;
    }
    public function countries($text): array
    {
        $text = strtolower(
            $this->normalize($text)
        );
        $found = [];
        foreach (self::COUNTRY_TERMS as $country) {
            $country = strtolower(
                $this->normalize($country)
            );
            if (
                $country !== '' &&
                str_contains($text, $country)
            ) {
                $found[] = str_replace(' ', '_', $country);
            }
        }
        return $found;
    }
    private function normalize($value): string
    {
        return trim(
            (string) preg_replace(
                '/\s+/',
                ' ',
                str_replace(
                    ['_', '-', '.', '/'],
                    ' ',
                    $value
                )
            )
        );
    }
}
class Media
{
    private string $root;
    private int $id;
    private Mapper $mapper;
    private Post $post;
    private Tags $tags;
    public function __construct($root, $id, $mapper, $post, $tags)
    {
        $this->root = $root;
        $this->id = $id;
        $this->mapper = $mapper;
        $this->post = $post;
        $this->tags = $tags;
    }
    public function importImages(): array
    {
        return $this->importFiles(
            'image',
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
        );
    }
    public function importVideos(): array
    {
        return $this->importFiles(
            'video',
            ['mp4', 'webm', 'mov', 'avi', 'mkv']
        );
    }
    public function importAudio(): array
    {
        return $this->importFiles(
            'audio',
            ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac']
        );
    }
    public function importDocuments(): array
    {
        return $this->importFiles(
            'document',
            ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar']
        );
    }
    private function importFiles($type, array $extensions): array
    {
        $stats = [
            'imported' => 0,
            'skipped' => 0,
            'errors' => []
        ];
        $dir = $this->root.'/u/'.$this->id.'/'.$type;
        if (!is_dir($dir)) {
            return $stats;
        }
        $allowed = array_fill_keys($extensions, true);
        foreach (
            new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(
                    $dir,
                    FilesystemIterator::SKIP_DOTS
                )
            ) as $file
        ) {
            if (!$file->isFile()) {
                continue;
            }
            $extension = strtolower($file->getExtension());
            if (!isset($allowed[$extension])) {
                continue;
            }
            $originalName = $file->getFilename();
            try {
                if ($this->post->exists($type, $originalName)) {
                    $stats['skipped']++;
                    continue;
                }
                $newFile = $this->post->createFile('.'.$extension);
                $destination = $file->getPath().'/'.$newFile;
                if (!rename($file->getPathname(), $destination)) {
                    throw new Exception('Unable to rename file');
                }
                $this->mapper->addMedia(
                    $originalName,
                    $newFile
                );
                $postId = $this->post->insert([
                    'type' => $type,
                    'title' => $this->humanTitle($originalName),
                    'file' => $newFile,
                    'description' => null
                ]);
                $this->tags->create(
                    $postId,
                    array_merge(
                        $this->tags->tokens($originalName),
                        $this->tags->countries($originalName)
                    )
                );
                $stats['imported']++;
            } catch (Throwable $e) {
                $stats['errors'][] =
                    $originalName.': '.$e->getMessage();
            }
        }
        return $stats;
    }
    private function humanTitle($filename): string
    {
        $name = pathinfo($filename, PATHINFO_FILENAME);
        $name = str_replace(
            ['_', '-', '.', '/'],
            ' ',
            $name
        );
        return ucwords(trim($name));
    }
}
class Template
{
    private string $root;
    private int $id;
    private Mapper $mapper;
    private Post $post;
    private Tags $tags;
    public function __construct($root, $id, $mapper, $post, $tags)
    {
        $this->root = $root;
        $this->id = $id;
        $this->mapper = $mapper;
        $this->post = $post;
        $this->tags = $tags;
    }
    public function import(): array
    {
        $stats = [
            'imported' => 0,
            'skipped' => 0,
            'errors' => []
        ];
        $dir = $this->root.'/u/'.$this->id.'/template';
        if (!is_dir($dir)) {
            $stats['errors'][] = 'Template directory not found';
            return $stats;
        }
        foreach (glob($dir.'/*.json') ?: [] as $path) {
            $name = basename($path);
            try {
                if ($this->post->exists('template', $name)) {
                    $stats['skipped']++;
                    continue;
                }
                $json = json_decode(
                    file_get_contents($path),
                    true
                );
                if (!is_array($json)) {
                    $stats['errors'][] = $name.': invalid json';
                    continue;
                }
                $title = $this->humanTitle(
                    pathinfo($name, PATHINFO_FILENAME)
                );
                $file = $this->post->createFile('.json');
                $destination = $dir.'/'.$file;
                file_put_contents(
                    $destination,
                    json_encode(
                        $json,
                        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
                    )
                );
                $this->mapper->setTemplate(
                    $title,
                    $file
                );
                $postId = $this->post->insert([
                    'type' => 'template',
                    'title' => $title,
                    'file' => $file,
                    'description' => null
                ]);
                $this->createFields(
                    $postId,
                    $json
                );
                $this->tags->create(
                    $postId,
                    array_merge(
                        $this->tags->tokens($title),
                        $this->tags->countries($title)
                    )
                );
                unlink($path);
                $stats['imported']++;
            } catch (Throwable $e) {
                $stats['errors'][] =
                    $name.': '.$e->getMessage();
            }
        }
        return $stats;
    }
    private function createFields($templateId, array $fields): void
    {
        foreach ($fields as $position => $field) {
            if (!is_array($field)) {
                continue;
            }
            $name = trim(
                $field['name'] ?? ''
            );
            if ($name === '') {
                continue;
            }
            Query::execute(
                'INSERT INTO dyscover_template_fields(template_id,name,type,position) VALUES(?,?,?,?)',
                [
                    $templateId,
                    $name,
                    $field['type'] ?? 'Text',
                    $position
                ]
            );
        }
    }
    private function humanTitle($filename): string
    {
        $filename = str_replace(
            ['_', '-', '.', '/'],
            ' ',
            $filename
        );
        return ucwords(trim($filename));
    }
}
class Article
{
    private string $root;
    private int $id;
    private Mapper $mapper;
    private Post $post;
    private Tags $tags;
    private Media $media;
    public function __construct($root, $id, $mapper, $post, $tags)
    {
        $this->root = $root;
        $this->id = $id;
        $this->mapper = $mapper;
        $this->post = $post;
        $this->tags = $tags;
    }
    public function import(): array
    {
        $stats = [
            'imported' => 0,
            'skipped' => 0,
            'errors' => []
        ];
        $dir = $this->root.'/u/'.$this->id.'/article';
        if (!is_dir($dir)) {
            $stats['errors'][] = 'Article directory not found';
            return $stats;
        }
        foreach (array_merge(
            glob($dir.'/*.php') ?: [],
            glob($dir.'/*.html') ?: []
        ) as $path) {
            $name = basename($path);
            if ($this->ignore($name)) {
                continue;
            }
            try {
                if ($this->post->exists('article', $name)) {
                    $stats['skipped']++;
                    continue;
                }
                $content = file_get_contents($path);
                $content = $this->replaceMedia($content);
                $content = $this->replaceTemplates($content);
                $content = $this->replaceLinks($content);
                $content = $this->clean($content);
                $content = $this->tidy($content);
                $title = $this->extractTitle(
                    $content,
                    $name
                );
                $description = $this->extractDescription(
                    $content
                );
                if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'php') {
                    $content = preg_replace(
                        '/<\?php.*?\?>/s',
                        '',
                        $content
                    );
                }
                $file = $this->mapper->getArticle(
                    pathinfo($name, PATHINFO_FILENAME)
                );
                if (!$file) {
                    $file = pathinfo(
                        $this->post->createFile('.html'),
                        PATHINFO_FILENAME
                    );
                }
                $file .= '.html';
                file_put_contents(
                    $dir.'/'.$file,
                    $content
                );
                if ($path !== $dir.'/'.$file) {
                    unlink($path);
                }
                $postId = $this->post->insert([
                    'type' => 'article',
                    'title' => $title,
                    'file' => $file,
                    'description' => $description
                ]);
                $this->tags->create(
                    $postId,
                    array_merge(
                        $this->tags->tokens($title),
                        $this->tags->countries($title)
                    )
                );
                $stats['imported']++;
            } catch (Throwable $e) {
                $stats['errors'][] =
                    $name.': '.$e->getMessage();
            }
        }
        return $stats;
    }
    public function updateAllLinks() {
        $dir = $this->root.'/u/'.$this->id.'/article';
        foreach (glob($dir.'/*.html') ?: [] as $file) {
            $content = file_get_contents($file);
            $content = $this->replaceLinks($content);
            file_put_contents(
                $file,
                $content
            );
        }
    }
    private function replaceLinks($content): string
    {
        return preg_replace_callback(
            '/href=["\']([^"\']+)["\']/i',
            function ($match) {
                foreach ($this->mapper->getArticleMap() as $old => $new) {
                    if (
                        preg_match(
                            '~/article/'.preg_quote($old, '~').'(\.html)?($|[?#])~i',
                            $match[1]
                        )
                    ) {
                        return 'href="'.DYSCOVER_URL.'/article/'.$new.'"';
                    }
                }
                return $match[0];
            },
            $content
        );
    }
    public function replaceMedia($content): string
    {
        foreach ($this->mapper->getMediaMap() as $old => $new) {
            $content = preg_replace(
                '#https?://dyscover\.ielectro\.com/(content|u/\d+)/' .
                '(image|video|audio|document)/' .
                preg_quote($old, '#') .
                '(\?[^"\']*)?#i',
                DYSCOVER_URL.'/u/' .
                $this->id .
                '/$2/' .
                $new .
                '$3',
                $content
            );
        }
        return $content;
    }
    private function replaceTemplates($content): string
    {
        return preg_replace_callback(
            '/data-title=["\']([^"\']+)["\']/i',
            function ($match) {
                $file = $this->mapper->getTemplate(
                    $match[1]
                );
                if (!$file) {
                    return $match[0];
                }
                return 'data-file="'.$file.'"';
            },
            $content
        );
    }
    private function clean($html): string
    {
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadHTML(
            $html,
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        $xpath = new DOMXPath($dom);
        $content = $xpath
            ->query('//section[contains(@class,"content")]')
            ->item(0);
        if (!$content) {
            return $html;
        }
        foreach ($xpath->query('//*[@class="title"]') as $node) {
            $node->parentNode->removeChild($node);
        }
        $output = '';
        foreach ($content->childNodes as $child) {
            $output .= $dom->saveHTML($child);
        }
        return trim($output);
    }
    private function tidy($html): string
    {
        if (!class_exists('tidy')) {
            return $html;
        }
        $tidy = new tidy();
        $tidy->parseString(
            $html,
            [
                'indent' => true,
                'show-body-only' => true,
                'clean' => true
            ],
            'UTF8'
        );
        $tidy->cleanRepair();
        return trim((string) $tidy);
    }
    private function extractTitle($content, $name): string
    {
        if (
            preg_match(
                '/<h1[^>]*class=["\']title["\'][^>]*>(.*?)</h1>/is',
                $content,
                $match
            )
        ) {
            return trim(strip_tags($match[1]));
        }
        return ucwords(
            str_replace(
                ['-', '_'],
                ' ',
                pathinfo($name, PATHINFO_FILENAME)
            )
        );
    }
    private function extractDescription($content): string
    {
        $text = trim(
            preg_replace(
                '/\s+/',
                ' ',
                strip_tags($content)
            )
        );
        return mb_substr($text, 0, 250);
    }
    private function ignore($name): bool
    {
        return in_array(
            strtolower($name),
            ['index.html', '.htaccess'],
            true
        );
    }
}
class Preview
{
    private string $root;
    private int $id;
    public function __construct($root, $id)
    {
        $this->root = $root;
        $this->id = $id;
    }
    public function import() {
        $dir = $this->root.'/u/'.$this->id.'/article';
        foreach (glob($dir.'/*.html') ?: [] as $file) {
            $content = file_get_contents($file);
            $preview = $this->extract($content);
            if (!$preview) {
                continue;
            }
            $filename = basename($file);
            Query::execute(
                'UPDATE dyscover_posts SET preview_image = ? WHERE type = ? AND file = ?',
                [
                    $preview,
                    'article',
                    $filename
                ]
            );
        }
    }
    private function extract($html): ?string
    {
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadHTML(
            $html,
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        $xpath = new DOMXPath($dom);
        $image = $xpath->query(
            '//img[contains(concat(" ", normalize-space(@class), " "), " article-image ")]'
        )->item(0);
        if (!$image) {
            return DYSCOVER_URL.'/media/default-image.jpg';
        }
        return trim($image->getAttribute('src'));
    }
}
