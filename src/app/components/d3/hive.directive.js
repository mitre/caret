(function() {
  'use strict';

  angular
    .module('caret')
    .directive('hive', hiveDirective);

  /** @ngInject */
  function hiveDirective($parse, d3, _) {
    var directive = {
      restrict: 'E',
      replace: false,
      scope: {
        width: '=width', 
        height: '=height', 
        links: '=links',
        border: '=border',
        labels: '=labels',
        nodes: '=nodes'
      },
      link: link
    };

    return directive;

    /** @ngInject */
    function link (scope, element) {
      var root = d3.select(element[0]);
      d3.select(element[0]).append("svg");
      d3.select(element[0]).append("p")
        .style("height", "1em");
      
      var graph = resizeGraph(scope);

      var nl = buildNodesAndLinks(scope),
          _nodes = nl[0],
          _links = nl[1];

      drawHive(root, graph, _nodes, _links);

      scope.$watch("height", function() {
        graph = resizeGraph(scope);
        drawHive(root, graph, _nodes, _links);
      });

      scope.$watch("width", function() {
        graph = resizeGraph(scope);
        drawHive(root, graph, _nodes, _links);
      });

      scope.$watch("border", function() {
        graph = resizeGraph(scope);
        drawHive(root, graph, _nodes, _links);
      });

      scope.$watch("labels", function () {
        drawHive(root, graph, _nodes, _links);
      });

      scope.$watchCollection("nodes", function() {
        graph = resizeGraph(scope);
        nl = buildNodesAndLinks(scope);
        _nodes = nl[0];
        _links = nl[1];
        drawHive(root, graph, _nodes, _links);
      });

      scope.$watchCollection("links", function() {
        graph = resizeGraph(scope);
        nl = buildNodesAndLinks(scope);
        _nodes = nl[0];
        _links = nl[1];
        drawHive(root, graph, _nodes, _links);
      });
    } 

    function reposition(svg, graph) {
      //this function will ignore animations, which is fine
      svg = svg.attr("width", graph.width)
        .attr("height", graph.height);

      //reposition nodes
      svg.selectAll(".node-group")
        .attr("transform", function(d) { return "translate(" + graph.xs(d.x) + ", " + graph.ys(d.y) + ")"; });

      //reposition links
      svg.selectAll(".link")
        .attr("d",
          hiveLink()
          .projection(function (d) { return {x: graph.xs(d.x), y: graph.ys(d.y)}; }));

      //reposition axis
      svg.selectAll(".axis")
        .attr("class", "axis")
        .attr("x1", function(d) { return graph.xs(d); })
        .attr("x2", function(d) { return graph.xs(d); })
        .attr("y1", graph.ys(0))
        .attr("y2", graph.ys(1));

      //reposition axis-label
      svg.selectAll(".label")
        .attr("x", function (_, i) { return graph.xs(i); })
        .attr("y", graph.border / 2.0 );
    }

    function buildNodesAndLinks(scope) {
      var oldNodeMap = {};
      var _nodes = _.map(scope.nodes, function (node) {
        var temp = {},
            newObj = _.clone(node);
        temp[node.x + ':' + node.y] = newObj;
        angular.extend(oldNodeMap, temp);
        newObj.selected = false;
        newObj.links = [];
        return newObj;
      });

      var _links = _.map(scope.links, function (link) {
        var newObj = _.clone(link);
        newObj.source = oldNodeMap[newObj.source.x + ':' + newObj.source.y];
        newObj.target = oldNodeMap[newObj.target.x + ':' + newObj.target.y];
        return angular.extend(newObj, {selected: false});
      });

      angular.forEach(_links, function (l) {
        l.target.links.push(l); 
        l.source.links.push(l);
      });

      return [_nodes, _links];
    }

    function resizeGraph(scope) {
      var width = scope.width,
      height = scope.height,
      numAxis = _.reduce(scope.nodes, function(memo, elem){ return memo < elem.x ? elem.x : memo; }, -1) + 1,
      border = scope.border,
      labels = scope.labels,
      y_range = [border, height - 5],
      xs = d3.scale.ordinal().domain(d3.range(numAxis)).rangeRoundPoints([0, width], 0.35),
      ys = d3.scale.linear().range(y_range),
      color = d3.scale.category10().domain(d3.range(20));

      return {
        width: width,
        height: height,
        numAxis: numAxis,
        border: border,
        labels: labels,
        y_range: y_range,
        xs: xs,
        ys: ys,
        color: color
      };
    }

    function addButton(graph, toolbar, text, dy, clickHandler, font_size, font_family) {
      if (graph.buttons === undefined) {
        graph.buttons = 1;
      } else {
        graph.buttons = graph.buttons + 1;
      }

      // each button is 32 wide and there is 6 in between them
      toolbar
        .attr('transform', 'translate(' + (graph.width - 38*graph.buttons - 6) + ', ' + (graph.height - 50) + ')');

      var button = toolbar.append('g')
        .attr('class', 'button');

      if (graph.buttons > 1) {
        button.attr('transform', 'translate(' + 38 * (graph.buttons - 1) + ', 0)');
      }
      button.append('rect')
        .attr("x", "0")
        .attr("y", "0")
        .attr("rx", "5")
        .attr("ry", "5")
        .attr("width", "32") 
        .attr("height", "32")
        .style("fill", "rgb(63,81,181)")
        .style("stroke", "black")
        .style("stroke-width", "1")
        .style("cursor", "pointer")
        .on("click", clickHandler);

      var t = button.append("text");
      t
        .attr("class", "button-label")
        .attr("x", "16")
        .attr("y", "16")
        .attr("text-anchor", "middle")
        .style("cursor", "pointer")
        .attr("dy", dy)
        .text(text)
        .on("click", clickHandler);

      if (font_size !== undefined) {
        t.style("font-size", font_size);
      }

      if (font_family !== undefined) {
        t.style("font-family", font_family);
      }
    }

    function clearHive(svg) {
      svg.selectAll("*").remove();
    }

    function drawHive(root, graph, _nodes, _links) {
      graph.nodesVisible = true;

      var svg = root.select("svg");
      var p = root.select("p");
      
      clearHive(svg);
      
      svg = svg.attr("width", graph.width)
        .attr("height", graph.height);

      var scalable = svg.append("g");

      var zoom = d3.behavior.zoom();
      svg.call(zoom.scaleExtent([0.25, 4]).on("zoom", function() {
        scalable.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
        d3.event.sourceEvent.stopPropagation();
      }))
         // remove the double click zoom behavior
        .on("dblclick.zoom", null); 

      scalable.selectAll(".axis")
          .data(d3.range(graph.numAxis))
        .enter().append("line")
          .attr("class", "axis")
          .attr("x1", function(d) { return graph.xs(d); })
          .attr("x2", function(d) { return graph.xs(d); })
          .attr("y1", graph.ys(0))
          .attr("y2", graph.ys(1));

      scalable.selectAll(".link")
          .data(_links)
        .enter().append("path")
          .attr("class", "link")
          .attr("d",
            hiveLink()
            .projection(function (d) { return {x: graph.xs(d.x), y: graph.ys(d.y)}; }))
          .style("stroke", "grey");

      var nodeGroup = scalable.selectAll(".node-group").data(_nodes),
      nodeGroupEnter = nodeGroup.enter().append("g")
        .attr("class", 'node-group')
        .attr("transform", function(d) { return "translate(" + graph.xs(d.x) + ", " + graph.ys(d.y) + ")"; });

      nodeGroupEnter.append("circle")
        .attr("class", "node")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .style("fill", function(d) { return graph.color(d.x); })
        .on("mouseover", _.partial(mouseover, p))
        .on("mouseout", _.partial(mouseout, p))
        .on("click", _.partial(nodeclick, svg, graph, _nodes, _links));

      nodeGroupEnter.append("text")
        .attr("class", "node-label")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy",".3em")
        .attr("text-anchor", "middle")
        .attr("font-size", "6px")
        .on("mouseover", _.partial(mouseover, p))
        .on("mouseout", _.partial(mouseout, p))
        .on("click", _.partial(nodeclick, svg, graph, _nodes, _links))
        .style("cursor", "default")
        .text(function (d) { return d.name; });

      svg.selectAll(".node-label").classed("invisible", true);

      scalable.selectAll(".label")
          .data(graph.labels)
        .enter().append("text")
          .attr("class", "label")
          .attr("x", function (_, i) { return graph.xs(i); })
          .attr("y", graph.border / 2.0 )
          .attr("text-anchor", "middle")
          .style("cursor", "default")
          .text(function (d) { return d; });

      var toolbar = svg.append("g");
      toolbar
        .attr('class', 'toolbar');
      
      addButton(graph, toolbar, "A/\u2022", ".3em", _.partial(toggleNode, svg, graph));
      addButton(graph, toolbar, "\uE8C4", ".5em", _.partial(centerGraph, scalable, zoom), "1.5em", "Material Icons");
      // addButton(graph, toolbar, "\uE5D4", ".5em", _.partial(centerGraph, scalable, zoom), "1.5em", "Material Icons");

      svg.on("click", function () {
        // prevent drags from triggering click handler
        if (d3.event.defaultPrevented) { return; }
        
        if (!d3.select(d3.event.target).classed('node') && 
          !d3.select(d3.event.target).classed('node-label') &&
          !d3.select(d3.event.target).classed('button') &&
          !d3.select(d3.event.target).classed('button-label')) {
          deselectNode(svg, graph, _nodes, _links);
        }
      });
    }

    function centerGraph(scalable, zoom) {
      scalable.attr("transform", "translate(0, 0) scale(1)");
      zoom.scale(1);
      zoom.translate([0, 0]);
    }

    function toggleNode(svg, graph) {
      graph.nodesVisible = !graph.nodesVisible;
      svg.selectAll(".node").classed("invisible", !graph.nodesVisible);
      svg.selectAll(".node-label").classed("invisible", graph.nodesVisible);
    }

    function deselectNode(svg, graph, _nodes, _links) {
      angular.forEach(_links, function (l) {l.selected = false;});
      angular.forEach(_nodes, function (n) {n.selected = false; n.primary = false;});

      svg.selectAll(".node").classed("primary", function (p) { return p.primary; });
      svg.selectAll(".node-label").classed("primary", function (p) { return p.primary; });

      // on deselect send back to original position
      svg.selectAll(".node-group.selected")
        .transition()
        .attr("transform", function(d) { 
          return "translate(" + graph.xs(d.x) + ", " + graph.ys(d.y) + ")"; 
        });

      svg.selectAll(".link.selected")
        .transition()
        .attr("d",
          hiveLink()
          .projection(function (d) { return {x: graph.xs(d.x), y: graph.ys(d.y)}; }));

      svg.selectAll(".node-label").attr("font-size", "6px");

      svg.selectAll(".active").classed("active", false);
      svg.selectAll(".selected").classed("selected", false);
      svg.selectAll(".unselected").classed("unselected", false);
    }

    /* Note because this function uses a partial d must always be the last argument */
    function nodeclick(svg, graph, _nodes, _links, d) {
      deselectNode(svg, graph, _nodes, _links);

      d3.select(this).classed("selected", true);

      d.primary = true;
      d.selected = true;
      
      svg.selectAll(".node").classed("primary", function (p) { return p.primary; });
      svg.selectAll(".node-label").classed("primary", function (p) { return p.primary; });

      var left = d.x,
          right = d.x,
          highlightLinkIf = function (l, r) {
            return function(p) { 
              if ((p.source.selected || p.target.selected) && 
                !(p.source.x <= r && p.source.x >= l &&
                p.target.x <= r && p.target.x >= l))
              {
                p.selected = true;
              }
              return p;
            };
          },
          highlightNodes = function(p) { 
            if (p.selected) 
            {
              p.source.selected = true;
              p.target.selected = true;
            }
            return p;
          };

      svg.selectAll(".link.selected").classed("unselected", true);
      svg.selectAll(".node").classed("unselected", true);
      svg.selectAll(".node-group").classed("unselected", true);
      svg.selectAll(".node-label").classed("unselected", true);

      while (left !== 0 || right !== graph.numAxis - 1) 
      {
        _links = _.map(_links, highlightLinkIf(left, right));
        angular.forEach(_links, highlightNodes);
        svg.selectAll(".link").classed("selected", function (p) { return p.selected; });
        svg.selectAll(".node").classed("selected", function (p) { return p.selected; });
        left = left - 1 > 0 ? left - 1 : 0;
        right = right + 1 < graph.numAxis - 1 ? right + 1 : graph.numAxis - 1;
      }
      svg.selectAll(".link").classed("unselected", function (p) { return !p.selected; });
      svg.selectAll(".node").classed("unselected", function (p) { return !p.selected; });
      svg.selectAll(".node-group").classed("selected", function (p) { return p.selected; });
      svg.selectAll(".node-group").classed("unselected", function (p) { return !p.selected; });
      svg.selectAll(".node-label").classed("selected", function (p) { return p.selected; });
      svg.selectAll(".node-label").classed("unselected", function (p) { return !p.selected; });

      // setup transitions and font size
      for (var i = 0; i < graph.numAxis; i++) {
        var ns = _.filter(_nodes, {x: i, selected: true});

        var new_ys = d3.scale.ordinal().domain(d3.range(ns.length)).rangePoints([0, 1], 1.0),
            font_size_band = d3.scale.ordinal().domain(d3.range(ns.length)).rangeRoundBands(graph.y_range).rangeBand(),
            font_size = font_size_band < 16 ? font_size_band : 16;
        
        for (var j = 0; j < ns.length; j++) {
          angular.extend(ns[j], {new_y : new_ys(j), font_size: font_size});
        }
      }
      svg.selectAll(".node-group.selected")
        .transition()
        .attr("transform", function(d) { 
          return "translate(" + graph.xs(d.x) + ", " + graph.ys(d.new_y) + ")"; 
        });  
      
      svg.selectAll(".node-label.selected")
        .attr("font-size", function (d) { return d.font_size.toString() + 'px'; });

      svg.selectAll(".link.selected")
        .transition()
        .attr("d",
          hiveLink()
          .projection(function (d) { return {x: graph.xs(d.x), y: graph.ys(d.new_y)}; }));
    }

    function addToWorkingSet(d) {
      d3.select(this);
    }

    function mouseover(p, d) {
      d3.select(this).classed("active", true);
      p.text(d.name);
    }

    function mouseout(p) {
      d3.select(this).classed("active", false);
      p.text("");
    }

    function hiveLink() {
      var projection = function(d) { return {x: d.x, y: d.y}; };

      function link(d) {
        //d has source and target
        var proj_s = d3.functor(projection).call(this, d.source),
            proj_t = d3.functor(projection).call(this, d.target),
            l = [[proj_s.x, proj_s.y],
                 [0.67 * proj_s.x + 0.33 * proj_t.x, proj_s.y],
                 [0.33 * proj_s.x + 0.67 * proj_t.x, proj_t.y],
                 [proj_t.x, proj_t.y]],
            f =  d3.svg.line().interpolate('bundle');

            return f(l);
      }

      link.projection = function(value) {
        if (!arguments.length) {
          return projection; 
        }
        projection = value; 
        return link;
      };  

      return link;
    }
  }
})();