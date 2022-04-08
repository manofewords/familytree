/*
    required HTML5 features:
    -required attribute for input field
    -date type input field, with valueAsDate & min attributes
    -autocapitalize attribute for input field
    -SVG
    -placeholder attribute for input field
*/

function FamilyTree() {
    this.originX = 0;
    this.maxX = 0;
    this.shiftX = 0; // if 2 persons are born the same year, shift the lines a bit to the right
    this.data = []; // Array of Person
    this.paper = null; // SVG canvas
    this.highlight = {}; // structure that tells what to highlight when a person is selected
    this.clickedLinePersonId = null; // id of the Person of the line that was clicked
};

FamilyTree.prototype = {
    lineColor : '#2600B0',
    dotAndTextColor : '#FFFFFF',
    highlightColor : '#D72727',
    
    // use multiples of 2
    lineSeparationX : 10, // lineSeparationY ?
    lineSize : 20, // thickness of the lines
    yearInPixels : 20, // should be >= lineSize (to be able to display 1 child per year)
    linkLineSize : 4,
    
    init : function() {
        $('form#details').submit(this.createDelegate(this.editPerson, this)); 
        
        $('button#add').click(this.createDelegate(this.showForm, this));
        $('button#data').click(this.createDelegate(this.getData, this));
        $('button#cancel').click(this.createDelegate(this.hideForm, this));
                
        this.getData();
    },
    showForm : function(person) {
        var i, leni,
            otherPerson;
        
        // load data into form's <select>
        $('form#details option[value]').remove();
        for(i = 0, leni = this.data.length; i < leni; i++) {
            otherPerson = this.data[i];
            if(otherPerson != person) {
                $('form#details #optionTemplate').clone().removeAttr('id').val(otherPerson.id).text(otherPerson.toString()).appendTo('form#details select#father');
                $('form#details #optionTemplate').clone().removeAttr('id').val(otherPerson.id).text(otherPerson.toString()).appendTo('form#details select#mother');
            }
        }
        
        // pre-fill form fields 
        // if we're editing an existing person
        if(person) {
            this.setFormValues({
                id : person.id,
                name : person.name,
                birth : person.birth,
                death : person.death,
                father : person.father,
                mother : person.mother});
        } else {
            // clear form
            this.setFormValues({
                id : '',
                name : '',
                birth : '',
                death : '',
                father : '',
                mother : ''});
        }
        
        $('button#add').hide();
        $('button#edit').hide();
        $('button#data').hide();
        $('form#details').show();
    },
    hideForm : function() {
        $('form#details').hide();
        $('button#add').show();
        $('button#data').show();
        
        this.onPersonClick(null); // TODO: a bit of a hack...
    },
    editPerson : function() {
        var formValues,
            i, leni;
        
        formValues = this.getFormValues();
        
        // create new or edit existing?
        if(formValues.id) {
            // edit
            for(i = 0, leni = this.data.length; i < leni; i++) {
                if(this.data[i].id == formValues.id) {
                    this.data[i].name = formValues.name;
                    this.data[i].birth = formValues.birth;
                    this.data[i].death = formValues.death;
                    this.data[i].father = formValues.father;
                    this.data[i].mother = formValues.mother;
                    break;
                }
            }
        } else {
            // create
            this.data.push(new Person((this.data.length + 1),
                formValues.name,
                formValues.birth,
                formValues.death,
                formValues.father,
                formValues.mother));
        }
            
        this.hideForm();
            
        this.draw();
        
        return false; // stop event propagation
    },
    setFormValues : function(values) {
        $('form#details #id').val(values.id || '');
        $('form#details #name').val(values.name || '');
        $('form#details #birth').val(this.formatDate(values.birth) || '');
        $('form#details #death').val(this.formatDate(values.death) || '');
        $('form#details #father').val(values.father || '');
        $('form#details #mother').val(values.mother || '');
    },
    getFormValues : function() {
        var father = $('form#details #father').val(),
            mother = $('form#details #mother').val();

        return {
            id : $('form#details #id').val(),
            name : $('form#details #name').val(),
            birth : $('form#details #birth').attr('valueAsDate'),
            death : $('form#details #death').attr('valueAsDate') || null,
            father : father === "Father" ? null : father,
            mother : mother === "Mother" ? null : mother};
    },
    draw : function() {
        var i, leni,
            line,
            d,
            x,
            y,
            person,
            birthYear,
            width;
    
        this.data.sort(this.sortData); // very important! sort chronologically to draw parents first!
        
        this.originX = this.yearInPixels * this.data[0].birth.getFullYear();

        this.shiftX = 0;
        this.highlight = {};
        this.clickedLinePersonId = null;

        d = new Date();
        this.maxX = this.yearInPixels * (d.getFullYear() + 1) // be safe and put an additional year in case someone is born in the current year (leave room to draw the dot)
            + this.data.length * this.linkLineSize; // worst case scenario for shiftX 

        // clear previous drawing
        $('#canvas').empty();
        
        this.paper = Raphael('canvas', 
            (this.maxX - this.originX),
            this.data.length * (this.lineSeparationX + this.lineSize));

        var personLine = function(paper, lineSize, lineColor, highlight, x, y, width, person) {
            var line = paper.rect(x, 
                y, 
                width, 
                lineSize);
            line.attr('fill', lineColor);
            line.attr('stroke', lineColor);
            highlight[person.id].push(line);
            return line;
        }

        for(i = 0, leni = this.data.length; i < leni; i++) {
            person = this.data[i];
            birthYear = person.birth.getFullYear();

            if(i > 0 && birthYear === this.data[i-1].birth.getFullYear()) {
                this.shiftX += this.linkLineSize;
            }
            
            this.highlight[person.id] = [];
            
            x = this.yearInPixels * birthYear - this.originX + this.shiftX;
            y = i * (this.lineSeparationX + this.lineSize);

            width = this.maxX - this.yearInPixels * birthYear;
            if(typeof person.death === 'undefined') {
                width = this.yearInPixels * 80;
                // 3 "dotted" lines for people with unknown death dates
                personLine(this.paper, this.lineSize, this.lineColor, this.highlight, x + width + 5, y, 5, person);
                personLine(this.paper, this.lineSize, this.lineColor, this.highlight, x + width + 15, y, 4, person);
                personLine(this.paper, this.lineSize, this.lineColor, this.highlight, x + width + 24, y, 3, person);
            } else if(person.death) {
                width = this.yearInPixels * (person.death.getFullYear() - birthYear);
            }
            line = personLine(this.paper, this.lineSize, this.lineColor, this.highlight, x, y, width, person);
            
            // if the person lived for a very short period and its name cannot 
            // be displayed in the line, display it to the left
            if(width > 100) {
                text = this.paper.text(x + this.linkLineSize,
                    y + this.lineSize / 2,
                    person.toString());
                text.attr('text-anchor', 'start');
                text.attr('fill', this.dotAndTextColor);
            } else {
                text = this.paper.text(x - this.linkLineSize,
                    y + this.lineSize / 2,
                    person.toString());
                text.attr('text-anchor', 'end');
                text.attr('fill', this.lineColor);
            }
            
            line.node.onclick = this.createDelegate(this.onPersonClick, this, [person]);
                        
            // link to parents
            this.linkToParent(i, 'father', x);
            this.linkToParent(i, 'mother', x);
        }
        
        $('button#add').show();
        $('button#data').show();
    },
    // called when a person's line is clicked,
    // but also when the form is hidden (called with person = null)
    onPersonClick : function(person) {        
        var i, leni,
            highlights;

        // switch previous "OFF"
        if(this.clickedLinePersonId !== null) {
            highlights = this.highlight[this.clickedLinePersonId];
            for(i = 0, leni = highlights.length; i < leni; i++) { // TODO: use Array func
                highlights[i].attr('fill', this.lineColor);
                highlights[i].attr('stroke', this.lineColor);
            }
        }

        if(person && this.clickedLinePersonId !== person.id) {
            // switch new "ON"
            highlights = this.highlight[person.id];
            for(i = 0, leni = highlights.length; i < leni; i++) { // TODO: use Array func
                highlights[i].attr('fill', this.highlightColor);
                highlights[i].attr('stroke', this.highlightColor);
            }
            this.clickedLinePersonId = person.id;
            
            $('button#edit').click(this.createDelegate(this.showForm, this, [person])).show();
            $('button#add').hide();
        } else {
            this.clickedLinePersonId = null;
            
            $('button#edit').hide();
            if(person) {
                this.hideForm();
            }
        }
    },
    getData : function() {
        var i, leni, newData, data;

        if(this.data.length > 0) {
            newData = JSON.parse(prompt("Your data: ", JSON.stringify(this.data)));

            if(newData !== null) {
                // meh... JSON.parse(JSON.stringify(new Date()) is not a Date object
                // and the Person type gets lost too
                this.data = [];
                for(i = 0, leni = newData.length; i < leni; i++) {
                    data = newData[i];
                    if(data.birth !== null) {
                        data.birth = new Date(data.birth);
                    }
                    if(data.death !== null) {
                        data.death = new Date(data.death);
                    }
                    this.data.push(new Person(
                        data.id,
                        data.name, 
                        data.birth, 
                        data.death, 
                        data.father, 
                        data.mother));
                }

                this.draw();
            }
        } else {
            this.showForm();
        }
    },
    getParentIndex : function(person, kind) {
        var i, leni;
    
        for(i = 0, leni = this.data.length; i < leni; i++) {
            if(this.data[i].id == person[kind]) {
                return i;
            }
        }
        
        return -1;
    },
    sortData : function(a, b) {
        return a.birth - b.birth;
    },
    linkToParent : function(dataIndex, kind, x) {
        var person,
            index,
            dot,
            line;
        
        person = this.data[dataIndex];
    
        if(person[kind] !== null) {
            index = this.getParentIndex(person, kind);
            if(index >= 0) {
                this.highlight[person.id] = this.highlight[person.id].concat(this.highlight[person[kind]]);
                                      
                // dots representing children on parent's line
                dot = this.paper.circle(x + this.linkLineSize / 2,
                    index * (this.lineSeparationX + this.lineSize) + this.lineSize / 2, 
                    this.lineSize / 2);
                dot.attr('fill', this.dotAndTextColor);
                dot.attr('stroke', this.dotAndTextColor);
                
                // vertical line connecting to parents
                line = this.paper.rect(x,
                    index * (this.lineSeparationX + this.lineSize) + this.lineSize,
                    this.linkLineSize,
                    (dataIndex - index) * (this.lineSeparationX + this.lineSize));
                line.attr('fill', this.lineColor);
                line.attr('stroke', this.lineColor);
                line.toBack(); // below everything
                this.highlight[person.id].push(line);
            }
        }
    },
    /**
    * Helper function to preserve scope.
    * or http://www.extjs.com/deploy/dev/docs/source/Ext.html#method-Function-createDelegate
    */
    createDelegate : function(fn, thisObject, args) {
        return function() {
            return fn.apply(thisObject || this, args || arguments);
        };
    },
    /* TODO: use a library! */
    formatDate : function(date) {
        var leftPad;
    
        if(!date) {
            return null;
        } else {
            leftPad = function(n) {
                return (n<10?'0'+n:n);
            };
    
            return date.getFullYear() + '-' + leftPad((date.getMonth() + 1)) + '-' + leftPad(date.getDate());
        }
    }
};

function Person(id, name, birth, death, father, mother) {
    this.id = id;
    this.name = name; // String
    this.birth = birth; // Date
    this.death = death; // Date, null means alive, undefined means Person is dead but date is unknown
    this.father = father; // id
    this.mother = mother; // id
};

Person.prototype = {
    toString : function() {
        var death = ''
        if(typeof this.death === 'undefined') {
            death = '?'
        } else if(this.death) {
            death = this.death.getFullYear()
        }
        return this.name + ' ' +
            this.birth.getFullYear() + 
            (death ? '–' + death : '');
    }
};
