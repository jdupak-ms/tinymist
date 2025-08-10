use std::collections::HashMap;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

/// Point coordinate for annotation positioning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

/// Bounding rectangle for annotation positioning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Types of annotations supported
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AnnotationType {
    Arrow,
    HighlightBox,
}

/// Base annotation properties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseAnnotation {
    pub id: String,
    pub annotation_type: AnnotationType,
    pub page_number: u32,
    pub z_index: i32,
    pub opacity: f64,
    pub visible: bool,
    pub created: u64,
    pub modified: u64,
}

/// Arrow annotation specific properties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArrowAnnotation {
    #[serde(flatten)]
    pub base: BaseAnnotation,
    pub start: Point,
    pub end: Point,
    pub color: String,
    pub thickness: f64,
    pub arrow_head_size: f64,
    pub style: String, // solid, dashed, dotted
}

/// Highlight box annotation specific properties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightBoxAnnotation {
    #[serde(flatten)]
    pub base: BaseAnnotation,
    pub bounds: Bounds,
    pub color: String,
    pub border_color: Option<String>,
    pub border_width: f64,
    pub corner_radius: f64,
    pub style: String, // solid, dashed, dotted
}

/// Union type for all annotation types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "annotation_type", rename_all = "kebab-case")]
pub enum Annotation {
    Arrow(ArrowAnnotation),
    HighlightBox(HighlightBoxAnnotation),
}

impl Annotation {
    pub fn id(&self) -> &str {
        match self {
            Annotation::Arrow(a) => &a.base.id,
            Annotation::HighlightBox(a) => &a.base.id,
        }
    }

    pub fn page_number(&self) -> u32 {
        match self {
            Annotation::Arrow(a) => a.base.page_number,
            Annotation::HighlightBox(a) => a.base.page_number,
        }
    }

    pub fn set_modified(&mut self, timestamp: u64) {
        match self {
            Annotation::Arrow(a) => a.base.modified = timestamp,
            Annotation::HighlightBox(a) => a.base.modified = timestamp,
        }
    }
}

/// Animation keyframe for annotation properties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationKeyframe {
    pub time: f64, // Time in milliseconds
    pub properties: serde_json::Value, // Flexible property updates
}

/// Animation track for a specific annotation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationTrack {
    pub annotation_id: String,
    pub keyframes: Vec<AnimationKeyframe>,
    pub duration: f64,
    pub loop_animation: bool,
    pub easing: String, // linear, ease-in, ease-out, ease-in-out
}

/// Complete annotation document with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationDocument {
    pub version: String,
    pub document_id: String,
    pub annotations: Vec<Annotation>,
    pub animations: Vec<AnimationTrack>,
    pub metadata: AnnotationMetadata,
}

/// Metadata for annotation documents
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationMetadata {
    pub created: u64,
    pub modified: u64,
    pub author: Option<String>,
    pub description: Option<String>,
}

/// Annotation manager for storing and retrieving annotations
pub struct AnnotationManager {
    /// Map from document path to annotation document
    annotations_by_document: Arc<RwLock<HashMap<String, AnnotationDocument>>>,
    /// Map from annotation ID to document path for quick lookups
    annotation_index: Arc<RwLock<HashMap<String, String>>>,
}

impl AnnotationManager {
    pub fn new() -> Self {
        Self {
            annotations_by_document: Arc::new(RwLock::new(HashMap::new())),
            annotation_index: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Get all annotations for a specific document
    pub async fn get_annotations(&self, document_path: &str) -> Option<AnnotationDocument> {
        let annotations = self.annotations_by_document.read().await;
        annotations.get(document_path).cloned()
    }

    /// Add or update an annotation document
    pub async fn set_annotations(&self, document_path: String, mut doc: AnnotationDocument) {
        doc.metadata.modified = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        // Update annotation index
        let mut index = self.annotation_index.write().await;
        for annotation in &doc.annotations {
            index.insert(annotation.id().to_string(), document_path.clone());
        }
        drop(index);

        // Store the document
        let mut annotations = self.annotations_by_document.write().await;
        annotations.insert(document_path, doc);
    }

    /// Add a single annotation to a document
    pub async fn add_annotation(&self, document_path: &str, annotation: Annotation) -> Result<(), String> {
        let mut annotations = self.annotations_by_document.write().await;
        
        let doc = annotations.get_mut(document_path).ok_or("Document not found")?;
        
        // Check if annotation already exists
        if doc.annotations.iter().any(|a| a.id() == annotation.id()) {
            return Err("Annotation with this ID already exists".to_string());
        }

        doc.annotations.push(annotation.clone());
        doc.metadata.modified = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        // Update index
        drop(annotations);
        let mut index = self.annotation_index.write().await;
        index.insert(annotation.id().to_string(), document_path.to_string());

        Ok(())
    }

    /// Update an existing annotation
    pub async fn update_annotation(&self, annotation_id: &str, mut annotation: Annotation) -> Result<(), String> {
        let index = self.annotation_index.read().await;
        let document_path = index.get(annotation_id).ok_or("Annotation not found")?.clone();
        drop(index);

        let mut annotations = self.annotations_by_document.write().await;
        let doc = annotations.get_mut(&document_path).ok_or("Document not found")?;

        let annotation_pos = doc.annotations.iter().position(|a| a.id() == annotation_id)
            .ok_or("Annotation not found in document")?;

        annotation.set_modified(std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64);

        doc.annotations[annotation_pos] = annotation;
        doc.metadata.modified = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Ok(())
    }

    /// Remove an annotation
    pub async fn remove_annotation(&self, annotation_id: &str) -> Result<(), String> {
        let index = self.annotation_index.read().await;
        let document_path = index.get(annotation_id).ok_or("Annotation not found")?.clone();
        drop(index);

        let mut annotations = self.annotations_by_document.write().await;
        let doc = annotations.get_mut(&document_path).ok_or("Document not found")?;

        let annotation_pos = doc.annotations.iter().position(|a| a.id() == annotation_id)
            .ok_or("Annotation not found in document")?;

        doc.annotations.remove(annotation_pos);
        doc.metadata.modified = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        // Remove from index
        drop(annotations);
        let mut index = self.annotation_index.write().await;
        index.remove(annotation_id);

        Ok(())
    }

    /// Clear all annotations for a document
    pub async fn clear_annotations(&self, document_path: &str) -> Result<(), String> {
        let mut annotations = self.annotations_by_document.write().await;
        let doc = annotations.get_mut(document_path).ok_or("Document not found")?;

        // Remove all annotations from index
        let mut index = self.annotation_index.write().await;
        for annotation in &doc.annotations {
            index.remove(annotation.id());
        }
        drop(index);

        doc.annotations.clear();
        doc.metadata.modified = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Ok(())
    }

    /// Create a new empty annotation document for a path
    pub async fn create_document(&self, document_path: String) -> AnnotationDocument {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let doc = AnnotationDocument {
            version: "1.0.0".to_string(),
            document_id: document_path.clone(),
            annotations: Vec::new(),
            animations: Vec::new(),
            metadata: AnnotationMetadata {
                created: timestamp,
                modified: timestamp,
                author: None,
                description: None,
            },
        };

        let mut annotations = self.annotations_by_document.write().await;
        annotations.insert(document_path, doc.clone());

        doc
    }

    /// Export annotations to JSON
    pub async fn export_annotations(&self, document_path: &str) -> Result<String, String> {
        let annotations = self.annotations_by_document.read().await;
        let doc = annotations.get(document_path).ok_or("Document not found")?;
        serde_json::to_string_pretty(doc).map_err(|e| e.to_string())
    }

    /// Import annotations from JSON
    pub async fn import_annotations(&self, document_path: String, json_data: &str) -> Result<(), String> {
        let doc: AnnotationDocument = serde_json::from_str(json_data)
            .map_err(|e| format!("Failed to parse annotation data: {}", e))?;

        self.set_annotations(document_path, doc).await;
        Ok(())
    }
}

impl Default for AnnotationManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_annotation_manager() {
        let manager = AnnotationManager::new();
        let doc_path = "/test/document.typ".to_string();

        // Create a new document
        let doc = manager.create_document(doc_path.clone()).await;
        assert_eq!(doc.annotations.len(), 0);

        // Create an arrow annotation
        let arrow = Annotation::Arrow(ArrowAnnotation {
            base: BaseAnnotation {
                id: "arrow1".to_string(),
                annotation_type: AnnotationType::Arrow,
                page_number: 1,
                z_index: 1,
                opacity: 1.0,
                visible: true,
                created: 0,
                modified: 0,
            },
            start: Point { x: 10.0, y: 10.0 },
            end: Point { x: 50.0, y: 50.0 },
            color: "#ff0000".to_string(),
            thickness: 2.0,
            arrow_head_size: 10.0,
            style: "solid".to_string(),
        });

        // Add annotation
        manager.add_annotation(&doc_path, arrow).await.unwrap();

        // Retrieve and verify
        let retrieved_doc = manager.get_annotations(&doc_path).await.unwrap();
        assert_eq!(retrieved_doc.annotations.len(), 1);
        assert_eq!(retrieved_doc.annotations[0].id(), "arrow1");

        // Test export/import
        let exported = manager.export_annotations(&doc_path).await.unwrap();
        assert!(exported.contains("arrow1"));

        // Clear and import
        manager.clear_annotations(&doc_path).await.unwrap();
        let empty_doc = manager.get_annotations(&doc_path).await.unwrap();
        assert_eq!(empty_doc.annotations.len(), 0);

        manager.import_annotations(doc_path.clone(), &exported).await.unwrap();
        let imported_doc = manager.get_annotations(&doc_path).await.unwrap();
        assert_eq!(imported_doc.annotations.len(), 1);
    }
}