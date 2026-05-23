#ifndef EDITOR_H
#define EDITOR_H

#include <algorithm>
#include <stack>
#include <string>
#include <vector>

class EditorBuffer {
public:
    void type(const std::string &newText) {
        undoStack_.push(currentText_);
        while (!redoStack_.empty()) {
            redoStack_.pop();
        }
        currentText_ = newText;
    }

    std::string undo() {
        if (undoStack_.empty()) {
            return currentText_;
        }
        redoStack_.push(currentText_);
        currentText_ = undoStack_.top();
        undoStack_.pop();
        return currentText_;
    }

    std::string redo() {
        if (redoStack_.empty()) {
            return currentText_;
        }
        undoStack_.push(currentText_);
        currentText_ = redoStack_.top();
        redoStack_.pop();
        return currentText_;
    }

    std::string getText() const { return currentText_; }

    int undoSize() const { return static_cast<int>(undoStack_.size()); }
    int redoSize() const { return static_cast<int>(redoStack_.size()); }

    /** Top-most undo snapshots first, at most `limit` entries, each truncated for UI. */
    std::vector<std::string> undoStackPreviews(std::size_t limit = 5,
                                                std::size_t maxChars = 20) const {
        return stackPreviewsFromTop(undoStack_, limit, maxChars);
    }

    /** Top-most redo snapshots first, at most `limit` entries. */
    std::vector<std::string> redoStackPreviews(std::size_t limit = 5,
                                                std::size_t maxChars = 20) const {
        return stackPreviewsFromTop(redoStack_, limit, maxChars);
    }

private:
    static std::string truncatePreview(const std::string &s, std::size_t maxChars) {
        if (s.size() <= maxChars) {
            return s;
        }
        return s.substr(0, maxChars) + "…";
    }

    static std::vector<std::string> stackPreviewsFromTop(const std::stack<std::string> &src,
                                                         std::size_t limit,
                                                         std::size_t maxChars) {
        std::stack<std::string> copy = src;
        std::vector<std::string> out;
        while (!copy.empty() && out.size() < limit) {
            out.push_back(truncatePreview(copy.top(), maxChars));
            copy.pop();
        }
        return out;
    }

    std::stack<std::string> undoStack_;
    std::stack<std::string> redoStack_;
    std::string currentText_;
};

#endif
