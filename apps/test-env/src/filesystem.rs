use std::{collections::HashMap, fmt::Display, matches, ops::Add, println, vec, write};

#[derive(Debug)]
pub struct File {
    content: String,
}
#[derive(Debug, Default)]
pub struct Directory {
    children: HashMap<String, Node>,
}

#[derive(Debug)]
pub enum Node {
    File(File),
    Directory(Directory),
}

impl Node {
    pub fn create_root() -> Self {
        Node::Directory(Directory::new())
    }

    pub fn is_dir(&self) -> bool {
        matches!(self, Node::Directory(_))
    }

    pub fn is_file(&self) -> bool {
        matches!(self, Node::File(_))
    }

    fn as_dir_mut(&mut self) -> Option<&mut Directory> {
        match self {
            Node::Directory(d) => Some(d),
            Node::File(_) => None,
        }
    }

    fn as_dir(&self) -> Option<&Directory> {
        match self {
            Node::Directory(d) => Some(d),
            Node::File(_) => None,
        }
    }

    pub fn get(&self, path: impl Into<Path>) -> Option<&Self> {
        let mut path = path.into();
        match path.pop_root() {
            None => Some(self),
            Some(top_level) => self.as_dir()?.children.get(&top_level)?.get(path),
        }
    }

    pub fn get_mut(&mut self, path: impl Into<Path>) -> Option<&mut Self> {
        let mut path = path.into();
        match path.pop_root() {
            None => Some(self),
            Some(top_level) => self
                .as_dir_mut()?
                .children
                .get_mut(&top_level)?
                .get_mut(path),
        }
    }

    pub fn make_dir(&mut self, path: impl Into<Path>) {
        let mut path = path.into();
        let Some(top_level) = path.pop_root() else {
            return;
        };

        if let Some(dir) = self.as_dir_mut() {
            let child = dir
                .children
                .entry(top_level)
                .or_insert_with(|| Node::Directory(Directory::default()));
            child.make_dir(path);
        }
    }

    pub fn remove(&mut self, path: impl Into<Path>) {
        let mut path = path.into();
        let Some(filename) = path.pop_filename() else {
            return;
        };
        if let Some(dir) = self.get_mut(path).and_then(Node::as_dir_mut) {
            dir.children.remove(&filename);
        }
    }

    pub fn write_file(&mut self, path: impl Into<Path>, content: impl Into<String>) {
        let mut path = path.into();
        let Some(filename) = path.pop_filename() else {
            return;
        };
        if !path.is_empty() {
            self.make_dir(path.clone());
        }
        if let Some(dir) = self.get_mut(path).and_then(Node::as_dir_mut) {
            dir.children.insert(
                filename,
                Node::File(File {
                    content: content.into(),
                }),
            );
        }
    }

    pub fn list_files(&self) -> Vec<String> {
        match self.as_dir() {
            Some(dir) => dir.children.keys().cloned().collect(),
            None => vec![],
        }
    }

    pub fn get_content(&self) -> Option<String> {
        match self {
            Node::File(f) => Some(f.content.clone()),
            Node::Directory(_) => None,
        }
    }

    #[allow(unused)]
    pub fn print(&self) {
        self.print_aux("[ROOT]", 1);
    }

    fn print_aux(&self, name: &str, depth: usize) {
        let indent: String = (0..depth - 1).map(|_| ' ').collect();
        println!("{indent}- {name}");
        if let Some(dir) = self.as_dir() {
            for (child_name, child) in &dir.children {
                child.print_aux(child_name, depth + 1);
            }
        }
    }
}

impl Directory {
    pub fn new() -> Self {
        Directory {
            children: HashMap::new(),
        }
    }
}

// impl FSNode {
//     pub fn create_root() -> Self {
//         FSNode {
//             name: "[ROOT]".to_string(),
//             kind: NodeKind::Directory {
//                 children: Vec::new(),
//             },
//         }
//     }

//     pub fn push_file(&mut self, name: impl Into<String>, content: impl Into<String>) {
//         let name = name.into();
//         let content = content.into();
//         self.push(FSNode {
//             name,
//             kind: NodeKind::File { content },
//         })
//     }

//     pub fn push_dir(&mut self, name: impl Into<String>) {
//         let name = name.into();
//         self.push(FSNode {
//             name,
//             kind: NodeKind::Directory {
//                 children: Vec::new(),
//             },
//         })
//     }

//     fn push(&mut self, node: FSNode) {
//         if let NodeKind::Directory { children } = &mut self.kind {
//             children.push(node);
//         }
//     }

//     pub fn make_dir(&mut self, path: impl Into<Path>) {
//         let mut path = path.into();

//         let top_level = path.pop_root();

//         if let Some(top_level) = top_level {
//             if let NodeKind::Directory { children } = &mut self.kind {
//                 let dir =
//                     if let Some(dir) = children.iter_mut().find(|child| child.name == top_level) {
//                         dir
//                     } else {
//                         self.push_dir(&top_level);
//                         self.get_mut(top_level).unwrap()
//                     };
//                 dir.make_dir(path);
//             }
//         }
//     }

//     pub fn remove(&mut self, path: impl Into<Path>) {
//         let mut path = path.into();
//         if let Some(filename) = path.pop_filename() {
//             if let Some(dir) = self.get_mut(path) {
//                 if let NodeKind::Directory { children } = &mut dir.kind {
//                     if let Some(pos) = children.iter().position(|file| file.name == filename) {
//                         children.swap_remove(pos);
//                     }
//                 }
//             }
//         }
//     }

//     pub fn get(&self, path: impl Into<Path>) -> Option<&Self> {
//         let mut path = path.into();
//         let top_level = path.pop_root();

//         if let Some(top_level) = top_level {
//             if let NodeKind::Directory { children } = &self.kind {
//                 if let Some(m) = children.iter().find(|child| child.name == top_level) {
//                     return m.get(path);
//                 }
//             }
//             return None;
//         } else {
//             return Some(self);
//         }
//     }

//     pub fn get_mut(&mut self, path: impl Into<Path>) -> Option<&mut Self> {
//         let mut path = path.into();
//         let top_level = path.pop_root();

//         if let Some(top_level) = top_level {
//             if let NodeKind::Directory { children } = &mut self.kind {
//                 if let Some(m) = children.iter_mut().find(|child| child.name == top_level) {
//                     return m.get_mut(path);
//                 }
//             }
//             return None;
//         } else {
//             return Some(self);
//         }
//     }

//     #[allow(unused)]
//     pub fn print(&self) {
//         self.print_aux(1);
//     }

//     fn print_aux(&self, depth: usize) {
//         let space_string: String = (0..depth - 1).map(|_| ' ').collect();
//         let name = &self.name;
//         println!("{}- {}", space_string, name);
//         match &self.kind {
//             NodeKind::Directory { children } => {
//                 for file in children {
//                     file.print_aux(depth + 1);
//                 }
//             }
//             _ => {}
//         }
//     }

//     pub fn is_dir(&self) -> bool {
//         matches!(&self.kind, NodeKind::Directory { children: _ })
//     }

//     pub fn is_file(&self) -> bool {
//         matches!(&self.kind, NodeKind::File { content: _ })
//     }

//     pub fn list_files(&self) -> Vec<String> {
//         if let NodeKind::Directory { children } = &self.kind {
//             children.iter().map(|c| c.name.clone()).collect()
//         } else {
//             vec![]
//         }
//     }

//     pub fn get_content(&self) -> &String {
//         if let NodeKind::File { content } = &self.kind {
//             return content;
//         } else {
//             panic!("node is not a file");
//         }
//     }
// }

pub const SEP: char = '/';

#[derive(Clone)]
pub struct Path {
    inner: Vec<String>,
}
impl From<&str> for Path {
    fn from(value: &str) -> Self {
        value.to_string().into()
    }
}
impl From<String> for Path {
    fn from(value: String) -> Self {
        let parts = value
            .split(SEP)
            .filter_map(|s| if s.is_empty() { None } else { Some(s) })
            .fold(Vec::new(), |mut parts, part| {
                match part {
                    "." => {}
                    ".." => {
                        parts.pop();
                    }
                    part => parts.push(part.to_string()),
                }
                parts
            });
        Path { inner: parts }
    }
}
impl Into<String> for &Path {
    fn into(self) -> String {
        self.inner.join(SEP.to_string().as_str())
    }
}
impl Into<String> for Path {
    fn into(self) -> String {
        (&self).into()
    }
}

impl Add for Path {
    type Output = Path;
    fn add(mut self, rhs: Self) -> Self::Output {
        self.inner.extend(rhs.inner);
        Path { inner: self.inner }
    }
}

impl Display for Path {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let str: String = self.into();
        write!(f, "{}", str)
    }
}
impl Path {
    pub fn new() -> Self {
        Path { inner: Vec::new() }
    }
    pub fn is_empty(&self) -> bool {
        return self.inner.is_empty();
    }

    /// Pops the root part of a path and removes it from the path
    /// Ex:
    /// for the path `a/b/c/test.txt`, it returns `Some("a")` and mutates so it only contains `b/c/test.txt`
    pub fn pop_root(&mut self) -> Option<String> {
        if self.is_empty() {
            return None;
        }
        Some(self.inner.remove(0))
    }

    /// Returns the root part of a path
    /// Ex:
    /// for the path `a/b/c/test.txt`, it returns `Some("a")`
    pub fn get_root(&self) -> Option<&String> {
        self.inner.first()
    }

    /// Pops the filename part of a path
    /// Ex:
    /// for the path `a/b/c/test.txt`, it returns `Some("test.txt")` and mutates so it only contains `a/b/c`
    pub fn pop_filename(&mut self) -> Option<String> {
        if self.is_empty() {
            return None;
        }
        self.inner.pop()
    }

    /// Returns the filename part of a path
    /// Ex:
    /// for the path `a/b/c/test.txt`, it returns `Some("test.txt")`
    pub fn get_filename(&self) -> Option<&String> {
        self.inner.last()
    }
}
