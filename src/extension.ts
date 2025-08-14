import * as vscode from 'vscode';
import * as path from 'path';
import ignore from 'ignore';

// --- CONFIGURATION LISTS ---

const DEFAULT_EXCLUDES = [
  '**/LLM_*.md',
  '**/.gitignore',
  '**/.llmignore',
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',
  '**/node_modules/**',
  '**/bower_components/**',
  '**/vendor/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/target/**',
  '**/bin/**',
  '**/obj/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**',
  '**/env/**',
  '**/.mypy_cache/**',
  '**/.pytest_cache/**',
  '**/.tox/**',
  '**/*.egg-info/**',
  '**/.cache/**',
  '**/.npm/**',
  '**/.yarn/**',
  '**/.vscode/**',
  '**/.idea/**',
  '**/.vs/**',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/logs/**',
  '**/*.log',
  '**/coverage/**',
  '**/.nyc_output/**',
  '**/temp/**',
  '**/tmp/**',
];

const BINARY_EXTENSIONS_TO_EXCLUDE = [
  '*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.ico', '*.bmp', '*.tiff', '*.tif', '*.psd', '*.ai',
  '*.pdf', '*.doc', '*.docx', '*.ppt', '*.pptx', '*.xls', '*.xlsx', '*.odt', '*.ods', '*.odp',
  '*.zip', '*.gz', '*.tgz', '*.bz2', '*.xz', '*.7z', '*.rar', '*.tar', '*.iso', '*.dmg', '*.pkg', '*.deb', '*.rpm', '*.jar', '*.war', '*.ear',
  '*.mp3', '*.wav', '*.flac', '*.ogg', '*.aac', '*.m4a', '*.mp4', '*.mov', '*.avi', '*.mkv', '*.webm', '*.flv', '*.wmv',
  '*.woff', '*.woff2', '*.ttf', '*.eot', '*.otf',
  '*.exe', '*.dll', '*.so', '*.dylib', '*.bin', '*.dat', '*.o', '*.a', '*.lib', '*.app', '*.msi', '*.ko',
  '*.pyc', '*.pyo', '*.pyd', '*.class', '*.dex', '*.aar',
  '*.swp', '*.swo', '*.swn',
  '*.sqlite', '*.sqlite3', '*.db', '*.mdb', '*.accdb', '*.lock',
  '*.ipa', '*.apk', '*.wasm', '*.asar',
];

const EXT_TO_LANG: Record<string, string> = {
  // A
  '.ada': 'ada', '.adb': 'ada', '.ads': 'ada',
  '.astro': 'astro', '.asm': 'assembly',
  // B
  '.bash': 'bash', '.bat': 'bat', '.bib': 'bibtex',
  // C
  '.c': 'c', '.h': 'c',
  '.clj': 'clojure', '.cljc': 'clojure', '.cljs': 'clojure',
  '.cmake': 'cmake', 'CMakeLists.txt': 'cmake',
  '.coffee': 'coffeescript',
  '.conf': 'ini',
  '.cpp': 'cpp', '.hpp': 'cpp', '.cxx': 'cpp', '.hxx': 'cpp', '.cc': 'cpp', '.hh': 'cpp',
  '.cr': 'crystal',
  '.cs': 'csharp', '.csproj': 'xml',
  '.css': 'css',
  '.cjs': 'javascript',
  // D
  '.d': 'd', '.dart': 'dart', '.diff': 'diff',
  '.dockerfile': 'dockerfile', 'Dockerfile': 'dockerfile',
  '.env': 'dotenv',
  // E
  '.erl': 'erlang', '.hrl': 'erlang',
  '.ex': 'elixir', '.exs': 'elixir',
  // F
  '.f90': 'fortran', '.f95': 'fortran', '.for': 'fortran',
  '.fs': 'fsharp', '.fsi': 'fsharp', '.fsx': 'fsharp', '.fsproj': 'xml',
  '.fish': 'fish',
  // G
  '.gvy': 'groovy', '.groovy': 'groovy',
  '.gemspec': 'ruby', 'Gemfile': 'ruby',
  '.go': 'go',
  '.gql': 'graphql', '.graphql': 'graphql',
  // H
  '.hcl': 'hcl', '.hs': 'haskell', '.html': 'html', '.htm': 'html',
  // I
  '.ini': 'ini',
  // J
  '.java': 'java', '.js': 'javascript', '.jsx': 'jsx', '.json': 'json', '.jsonc': 'jsonc',
  // K
  '.kt': 'kotlin', '.kts': 'kotlin',
  // L
  '.less': 'less', '.lisp': 'lisp', '.lua': 'lua',
  // M
  '.m': 'objectivec', '.mm': 'objectivecpp',
  '.md': 'markdown',
  'Makefile': 'makefile', 'makefile': 'makefile',
  '.mjs': 'javascript',
  // N
  '.nim': 'nim', 'nginx.conf': 'nginx',
  // O - P
  '.pas': 'pascal', '.pp': 'pascal',
  '.pl': 'perl', '.pm': 'perl',
  '.php': 'php',
  '.ps1': 'powershell', '.psm1': 'powershell',
  '.prisma': 'prisma', '.properties': 'ini', '.proto': 'protobuf',
  '.py': 'python', '.pyw': 'python',
  // R
  '.r': 'r', '.rb': 'ruby', '.rs': 'rust',
  // S
  '.s': 'assembly', '.sass': 'sass', '.scala': 'scala', '.scm': 'scheme', '.scss': 'scss',
  '.sh': 'bash', '.sln': 'solution', '.sql': 'sql', '.styl': 'stylus', '.svelte': 'svelte', '.svg': 'xml', '.swift': 'swift',
  // T
  '.tex': 'latex', '.tf': 'terraform', '.tfvars': 'terraform', '.toml': 'toml', '.ts': 'typescript', '.tsx': 'tsx',
  // V
  '.v': 'vlang', '.vb': 'vbnet', '.vbproj': 'xml', '.vue': 'vue',
  // X
  '.xml': 'xml', '.xsl': 'xml', '.xslt': 'xml',
  // Y
  '.yaml': 'yaml', '.yml': 'yaml',
  // Z
  '.zig': 'zig', '.zsh': 'zsh',
};


export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('llmMd.generate', async () => {
    if (!vscode.workspace.workspaceFolders?.length) {
      vscode.window.showErrorMessage('Please open a folder or workspace first.');
      return;
    }
    const root = vscode.workspace.workspaceFolders[0].uri;

    const now = new Date();
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const year = now.getFullYear();
    const month = MONTHS[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const formattedTimestamp = `${year}_${month}_${day}_${hours}_${minutes}`;
    const outputFileName = `LLM_${formattedTimestamp}.md`;
    
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Generating ${outputFileName}`,
      cancellable: false
    }, async (progress) => {
      progress.report({ message: "Scanning files and applying rules..." });
      
      const filePaths = await collectFilePaths(root);

      progress.report({ message: "Building repository tree..." });
      const tree = await buildRepoTree(root, filePaths);

      progress.report({ message: "Generating document..." });
      const doc = await buildLLMDoc(root, tree, filePaths);
      const outUri = vscode.Uri.joinPath(root, outputFileName);

      await vscode.workspace.fs.writeFile(outUri, Buffer.from(doc, 'utf8'));

      vscode.window.showInformationMessage(`${outputFileName} created with ${filePaths.length} files.`);
      const docOpened = await vscode.workspace.openTextDocument(outUri);
      await vscode.window.showTextDocument(docOpened, { preview: false });
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

async function createUnifiedFilter(root: vscode.Uri): Promise<(path: string) => boolean> {
  const ig = ignore();
  const ignoreFileUris = await vscode.workspace.findFiles('**/{.gitignore,.llmignore}', '**/node_modules/**');

  for (const fileUri of ignoreFileUris) {
      try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const patterns = new TextDecoder('utf-8').decode(content);
          const relativeDir = path.dirname(path.relative(root.fsPath, fileUri.fsPath));
          
          const contextualizedPatterns = patterns.split(/\r?\n/).map(p => {
              p = p.trim();
              if (p === '' || p.startsWith('#')) return null;
              const isNegation = p.startsWith('!');
              if (isNegation) p = p.substring(1);
              if (p.startsWith('/')) p = p.substring(1);
              const finalPattern = path.join(relativeDir, p).replace(/\\/g, '/');
              return isNegation ? '!' + finalPattern : finalPattern;
          }).filter((p): p is string => p !== null);

          if (contextualizedPatterns.length > 0) ig.add(contextualizedPatterns);
      } catch (e) {
          console.warn(`Could not read or process ignore file: ${fileUri.fsPath}`, e);
      }
  }

  return (p: string) => !ig.ignores(p);
}

async function collectFilePaths(root: vscode.Uri): Promise<string[]> {
    const unifiedFilter = await createUnifiedFilter(root);

    const excludeGlob = `{${[...DEFAULT_EXCLUDES, ...BINARY_EXTENSIONS_TO_EXCLUDE.map(ext => `**/${ext}`)].join(',')}}`;
    const allFileUris = await vscode.workspace.findFiles('**/*', excludeGlob);

    const relativePaths = allFileUris
        .map(uri => path.relative(root.fsPath, uri.fsPath).replace(/\\/g, '/'))
        .filter(p => p && unifiedFilter(p));

    return relativePaths.sort((a, b) => a.localeCompare(b));
}

async function buildRepoTree(root: vscode.Uri, relPaths: string[]): Promise<string> {
    const rootNode = new Map<string, any>();
    for (const rel of relPaths) {
      const parts = rel.split('/');
      let currentNode = rootNode;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          currentNode.set(part, null);
        } else {
          if (!currentNode.has(part)) currentNode.set(part, new Map<string, any>());
          currentNode = currentNode.get(part);
        }
      }
    }
  
    const lines: string[] = [];
    const walk = (node: Map<string, any>, prefix: string = '') => {
      const keys = Array.from(node.keys()).sort((a, b) => {
        const aIsDir = node.get(a) instanceof Map;
        const bIsDir = node.get(b) instanceof Map;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });
  
      keys.forEach((key, idx) => {
        const isLast = idx === keys.length - 1;
        const pointer = isLast ? '└── ' : '├── ';
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        lines.push(prefix + pointer + key);
        const value = node.get(key);
        if (value instanceof Map) walk(value, nextPrefix);
      });
    };
  
    const rootName = path.basename(root.fsPath);
    lines.push(rootName);
    walk(rootNode, '');
  
    return lines.join('\n');
}

async function buildLLMDoc(root: vscode.Uri, tree: string, filePaths: string[]): Promise<string> {
  const sections: string[] = [];
  const now = new Date().toISOString();

  sections.push(`# LLM Context`);
  sections.push(`_Generated on ${now}_`);
  sections.push(``);

  let totalSize = 0;
  const fileContents: { path: string, content: string, lang: string, error?: string }[] = [];

  for (const rel of filePaths) {
    const lang = guessFence(rel);
    try {
      const uri = vscode.Uri.joinPath(root, rel);
      const content = await readTextFile(uri);
      totalSize += Buffer.byteLength(content, 'utf8');
      fileContents.push({ path: rel, content, lang });
    } catch (err: any) {
      const errorMessage = `(Could not read file: ${err?.message || String(err)})`;
      fileContents.push({ path: rel, content: errorMessage, lang: '', error: errorMessage });
    }
  }

  sections.push(`## Summary`);
  sections.push(`- **Total Files Included:** ${filePaths.length}`);
  sections.push(`- **Total Content Size:** ${Math.round(totalSize / 1024)} KB`);
  sections.push(``);

  sections.push(`## Repository Tree`);
  sections.push('```');
  sections.push(tree);
  sections.push('```');
  sections.push('');

  for (const file of fileContents) {
    sections.push(`---`);
    sections.push(`### \`${file.path}\``);

    const fileLang = file.error ? '' : file.lang;
    let fileContent = file.content;

    if (file.error) {
        // Content is already the error message
    } else if (!fileLang) {
        // Show placeholder if it's an unknown/binary type
        fileContent = '(Content for binary or unknown file type not displayed)';
    }
    
    sections.push('```' + fileLang);
    sections.push(fileContent);
    sections.push('```');
    sections.push('');
  }

  return sections.join('\n');
}

function guessFence(relPath: string): string {
  const baseName = path.basename(relPath);
  if (EXT_TO_LANG[baseName]) return EXT_TO_LANG[baseName];
  const ext = path.extname(baseName);
  return EXT_TO_LANG[ext] || '';
}

async function readTextFile(uri: vscode.Uri): Promise<string> {
  const buffer = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}