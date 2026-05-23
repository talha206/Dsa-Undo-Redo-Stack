#ifndef SYNTAX_H
#define SYNTAX_H

#include <cstddef>
#include <sstream>
#include <stack>
#include <string>
#include <utility>
#include <vector>

struct BracketTraceEntry {
    char bracket{};
    std::size_t position{};
    bool matched{false};
    int pairPosition{-1}; // index in source string of matching bracket, or -1
};

class SyntaxChecker {
public:
    static bool isOpening(char c) { return c == '(' || c == '[' || c == '{'; }
    static bool isClosing(char c) { return c == ')' || c == ']' || c == '}'; }

    static char expectedClose(char open) {
        switch (open) {
        case '(':
            return ')';
        case '[':
            return ']';
        case '{':
            return '}';
        default:
            return '\0';
        }
    }

    bool checkBrackets(const std::string &code) {
        std::stack<char> st;
        for (char c : code) {
            if (isOpening(c)) {
                st.push(c);
            } else if (isClosing(c)) {
                if (st.empty()) {
                    return false;
                }
                char o = st.top();
                if (!matches(o, c)) {
                    return false;
                }
                st.pop();
            }
        }
        return st.empty();
    }

    std::string getDetailedResult(const std::string &code) {
        std::stack<char> st;
        for (std::size_t i = 0; i < code.size(); ++i) {
            char c = code[i];
            if (isOpening(c)) {
                st.push(c);
            } else if (isClosing(c)) {
                if (st.empty()) {
                    std::ostringstream os;
                    os << "Error at position " << i << ": found '" << c
                       << "' but no matching opening bracket";
                    return os.str();
                }
                char o = st.top();
                if (!matches(o, c)) {
                    std::ostringstream os;
                    os << "Error at position " << i << ": found '" << c << "' but expected '"
                       << expectedClose(o) << "'";
                    return os.str();
                }
                st.pop();
            }
        }
        if (!st.empty()) {
            std::ostringstream os;
            os << "Error: unclosed '" << st.top() << "' — missing '" << expectedClose(st.top())
               << "'";
            return os.str();
        }
        return "All brackets balanced!";
    }

    /**
     * Builds ordered trace of every bracket character in `code` with match info.
     * On first syntax error, remaining brackets may be incomplete but trace covers
     * processed positions in order of appearance.
     */
    std::vector<BracketTraceEntry> getBracketTrace(const std::string &code) {
        std::vector<std::pair<char, std::size_t>> brackets;
        for (std::size_t i = 0; i < code.size(); ++i) {
            char c = code[i];
            if (isOpening(c) || isClosing(c)) {
                brackets.push_back({c, i});
            }
        }

        std::vector<BracketTraceEntry> trace(brackets.size());
        for (std::size_t i = 0; i < brackets.size(); ++i) {
            trace[i].bracket = brackets[i].first;
            trace[i].position = brackets[i].second;
            trace[i].matched = false;
            trace[i].pairPosition = -1;
        }

        std::stack<std::size_t> openIdx;
        for (std::size_t i = 0; i < brackets.size(); ++i) {
            char c = brackets[i].first;
            if (isOpening(c)) {
                openIdx.push(i);
            } else {
                if (openIdx.empty()) {
                    trace[i].matched = false;
                    break;
                }
                std::size_t j = openIdx.top();
                char o = brackets[j].first;
                if (!matches(o, c)) {
                    trace[i].matched = false;
                    break;
                }
                openIdx.pop();
                trace[j].matched = true;
                trace[j].pairPosition = static_cast<int>(brackets[i].second);
                trace[i].matched = true;
                trace[i].pairPosition = static_cast<int>(brackets[j].second);
            }
        }
        while (!openIdx.empty()) {
            std::size_t j = openIdx.top();
            openIdx.pop();
            trace[j].matched = false;
            trace[j].pairPosition = -1;
        }
        return trace;
    }

private:
    static bool matches(char open, char close) {
        return (open == '(' && close == ')') || (open == '[' && close == ']') ||
               (open == '{' && close == '}');
    }
};

#endif
