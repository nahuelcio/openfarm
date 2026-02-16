"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  BookOpen,
  Settings,
  Globe,
  Folder,
  Calendar,
  Tag,
  Link2,
  Eye,
  Edit3,
  Trash2,
  Filter,
  X,
  Clock,
  Hash,
} from "lucide-react";
import { memoryAPI, type MemoryDocument, type MemoryBankConfig } from "@/lib/memory-api";

interface MemoryDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MemoryDialog({ children, open, onOpenChange }: MemoryDialogProps) {
  const [memories, setMemories] = useState<MemoryDocument[]>([]);
  const [banks, setBanks] = useState<MemoryBankConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryDocument | null>(null);
  const [viewingMemory, setViewingMemory] = useState<MemoryDocument | null>(null);
  const [newMemory, setNewMemory] = useState({
    title: "",
    content: "",
    tags: [] as string[],
    bankId: "local",
  });
  const [tagInput, setTagInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMemories();
    loadBanks();
  }, [searchQuery, selectedBank, selectedTags]);

  const loadMemories = async () => {
    try {
      const bankIds = selectedBank === "all" ? undefined : [selectedBank];
      const results = await memoryAPI.searchMemories({
        query: searchQuery,
        bankIds,
        limit: 50,
      });
      
      // Filter by selected tags if any
      const filtered = selectedTags.length > 0
        ? results.filter(memory => 
            selectedTags.some(tag => memory.tags.includes(tag))
          )
        : results;
      
      setMemories(filtered);
    } catch (error) {
      console.error("Failed to load memories:", error);
    }
  };

  const loadBanks = async () => {
    try {
      const bankList = await memoryAPI.listMemoryBanks();
      setBanks(bankList);
    } catch (error) {
      console.error("Failed to load banks:", error);
    }
  };

  const handleCreateMemory = async () => {
    if (!newMemory.title.trim() || !newMemory.content.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await memoryAPI.createMemory({
        title: newMemory.title,
        content: newMemory.content,
        tags: newMemory.tags,
        bankId: newMemory.bankId,
      });

      // Reset form
      setNewMemory({ title: "", content: "", tags: [], bankId: "local" });
      setTagInput("");
      loadMemories();
    } catch (error) {
      console.error("Failed to create memory:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateMemory = async () => {
    if (!editingMemory) return;

    try {
      await memoryAPI.createMemory({
        title: editingMemory.title,
        content: editingMemory.content,
        tags: editingMemory.tags,
        bankId: editingMemory.bankId,
      });

      setEditingMemory(null);
      loadMemories();
    } catch (error) {
      console.error("Failed to update memory:", error);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    // For now, we'll just reload. In a real implementation, add delete API
    console.log("Delete memory:", memoryId);
    loadMemories();
  };

  const handleAddTag = (target: "new" | "edit", tag: string) => {
    if (target === "new") {
      if (!newMemory.tags.includes(tag)) {
        setNewMemory({ ...newMemory, tags: [...newMemory.tags, tag] });
      }
    } else if (editingMemory) {
      if (!editingMemory.tags.includes(tag)) {
        setEditingMemory({ ...editingMemory, tags: [...editingMemory.tags, tag] });
      }
    }
  };

  const handleRemoveTag = (target: "new" | "edit", tagToRemove: string) => {
    if (target === "new") {
      setNewMemory({
        ...newMemory,
        tags: newMemory.tags.filter((tag) => tag !== tagToRemove),
      });
    } else if (editingMemory) {
      setEditingMemory({
        ...editingMemory,
        tags: editingMemory.tags.filter((tag) => tag !== tagToRemove),
      });
    }
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    memories.forEach(memory => {
      memory.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBankIcon = (scope: string) => {
    switch (scope) {
      case "local":
        return <Folder className="h-4 w-4" />;
      case "shared":
        return <Globe className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getBankColor = (scope: string) => {
    switch (scope) {
      case "local":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "shared":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden w-screen h-screen sm:w-[95vw] sm:h-[95vh] sm:max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Memory System
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-full pb-4">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 px-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="w-full sm:w-[200px] h-10">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        {getBankIcon(bank.scope)}
                        <span>{bank.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {bank.scope}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-10"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" className="h-10">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Tag Filters */}
            {showFilters && (
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filter by tags:</span>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                      className="h-6 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {getAllTags().map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="browse" className="flex-1 overflow-hidden px-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create
              </TabsTrigger>
              {editingMemory && (
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </TabsTrigger>
              )}
            </TabsList>

            {/* Browse Tab */}
            <TabsContent value="browse" className="flex-1 overflow-hidden mt-4">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
                {/* Memory List */}
                <div className="xl:col-span-2 border rounded-lg overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-muted/30 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Memories</h3>
                      <Badge variant="secondary">{memories.length}</Badge>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {memories.map((memory) => (
                        <Card
                          key={memory.id}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setViewingMemory(memory)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-base truncate">{memory.title}</h4>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getBankColor(memory.scope)}`}
                                  >
                                    {getBankIcon(memory.scope)}
                                    <span className="ml-1">{memory.bankId}</span>
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                  {memory.content}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDate(memory.updatedAt)}</span>
                                  </div>
                                  {memory.observations.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      <span>{memory.observations.length} obs</span>
                                    </div>
                                  )}
                                  {memory.relations.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Link2 className="h-3 w-3" />
                                      <span>{memory.relations.length} rel</span>
                                    </div>
                                  )}
                                </div>
                                {memory.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {memory.tags.slice(0, 3).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        <Hash className="h-2 w-2 mr-1" />
                                        {tag}
                                      </Badge>
                                    ))}
                                    {memory.tags.length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{memory.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMemory(memory);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMemory(memory.id);
                                  }}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {memories.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <h3 className="text-lg font-medium mb-2">No memories found</h3>
                          <p className="text-sm">Try adjusting your search or create your first memory</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Memory Detail View - Hidden on mobile, visible on xl+ */}
                <div className="hidden xl:block border rounded-lg overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-muted/30 flex-shrink-0">
                    <h3 className="font-semibold">Details</h3>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-4">
                      {viewingMemory ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-lg mb-2">{viewingMemory.title}</h4>
                            <div className="flex items-center gap-2 mb-4">
                              <Badge
                                variant="outline"
                                className={getBankColor(viewingMemory.scope)}
                              >
                                {getBankIcon(viewingMemory.scope)}
                                {viewingMemory.bankId}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(viewingMemory.updatedAt)}
                              </span>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h5 className="font-medium mb-2">Content</h5>
                            <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                              {viewingMemory.content}
                            </div>
                          </div>

                          {viewingMemory.tags.length > 0 && (
                            <>
                              <Separator />
                              <div>
                                <h5 className="font-medium mb-2">Tags</h5>
                                <div className="flex flex-wrap gap-1">
                                  {viewingMemory.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      <Hash className="h-2 w-2 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          {viewingMemory.observations.length > 0 && (
                            <>
                              <Separator />
                              <div>
                                <h5 className="font-medium mb-2">Observations</h5>
                                <div className="space-y-2">
                                  {viewingMemory.observations.map((obs, idx) => (
                                    <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded">
                                      <Badge variant="outline" className="text-xs mb-1">
                                        {obs.kind}
                                      </Badge>
                                      <p className="text-sm">{obs.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          {viewingMemory.relations.length > 0 && (
                            <>
                              <Separator />
                              <div>
                                <h5 className="font-medium mb-2">Relations</h5>
                                <div className="space-y-1">
                                  {viewingMemory.relations.map((rel, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <Badge variant="outline" className="text-xs">
                                        {rel.type}
                                      </Badge>
                                      <Link2 className="h-3 w-3" />
                                      <span className="text-muted-foreground">{rel.target}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Select a memory to view details</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-full">
                <div className="max-w-2xl mx-auto p-4 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Create New Memory</CardTitle>
                      <CardDescription>
                        Add a new memory to your knowledge base
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          placeholder="Memory title..."
                          value={newMemory.title}
                          onChange={(e) =>
                            setNewMemory({ ...newMemory, title: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="bank">Memory Bank</Label>
                        <Select
                          value={newMemory.bankId}
                          onValueChange={(value) =>
                            setNewMemory({ ...newMemory, bankId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>
                                <div className="flex items-center gap-2">
                                  {getBankIcon(bank.scope)}
                                  <span>{bank.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {bank.scope}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          placeholder="Write your memory content here... You can use observations like [decision] and relations like [[other-memory]]"
                          value={newMemory.content}
                          onChange={(e) =>
                            setNewMemory({ ...newMemory, content: e.target.value })
                          }
                          rows={8}
                        />
                      </div>

                      <div>
                        <Label htmlFor="tags">Tags</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            id="tags"
                            placeholder="Add tag..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (tagInput.trim()) {
                                  handleAddTag("new", tagInput.trim());
                                  setTagInput("");
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (tagInput.trim()) {
                                handleAddTag("new", tagInput.trim());
                                setTagInput("");
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {newMemory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {newMemory.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => handleRemoveTag("new", tag)}
                              >
                                {tag}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleCreateMemory}
                        disabled={isCreating || !newMemory.title.trim() || !newMemory.content.trim()}
                        className="w-full"
                        size="lg"
                      >
                        {isCreating ? (
                          <>Creating...</>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Memory
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Edit Tab */}
            {editingMemory && (
              <TabsContent value="edit" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-full">
                  <div className="max-w-2xl mx-auto p-4 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Edit Memory</CardTitle>
                        <CardDescription>
                          Modify an existing memory
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="edit-title">Title</Label>
                          <Input
                            id="edit-title"
                            value={editingMemory.title}
                            onChange={(e) =>
                              setEditingMemory({ ...editingMemory, title: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="edit-content">Content</Label>
                          <Textarea
                            id="edit-content"
                            value={editingMemory.content}
                            onChange={(e) =>
                              setEditingMemory({ ...editingMemory, content: e.target.value })
                            }
                            rows={8}
                          />
                        </div>

                        <div>
                          <Label htmlFor="edit-tags">Tags</Label>
                          <div className="flex gap-2 mb-2">
                            <Input
                              id="edit-tags"
                              placeholder="Add tag..."
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (tagInput.trim()) {
                                    handleAddTag("edit", tagInput.trim());
                                    setTagInput("");
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (tagInput.trim()) {
                                  handleAddTag("edit", tagInput.trim());
                                  setTagInput("");
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          {editingMemory.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {editingMemory.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="cursor-pointer"
                                  onClick={() => handleRemoveTag("edit", tag)}
                                >
                                  {tag}
                                  <X className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdateMemory}
                            disabled={!editingMemory.title.trim() || !editingMemory.content.trim()}
                            className="flex-1"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Update Memory
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingMemory(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
